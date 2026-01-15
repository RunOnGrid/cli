import WebSocket from "ws";
import { execSync } from "child_process";

// Shell channel codes from Akash protocol
const SHELL_CHANNELS = {
  STDIN: 104,
  STDOUT: 100,
  STDERR: 101,
  RESULT: 102,
  FAILURE: 103,
  TERMINAL_RESIZE: 105
};

export class WebSocketClient {
  constructor() {
    this.ws = null;
  }

  /**
   * Send data to provider with correct channel byte
   */
  sendStdinData(ws, data) {
    if (ws.readyState !== WebSocket.OPEN) return false;

    let buffer;
    if (Buffer.isBuffer(data)) {
      buffer = data;
    } else if (typeof data === 'string') {
      buffer = Buffer.from(data, 'utf8');
    } else {
      buffer = Buffer.from(data);
    }

    // Create buffer with channel byte + data
    const channelBuffer = Buffer.allocUnsafe(1 + buffer.length);
    channelBuffer[0] = SHELL_CHANNELS.STDIN;
    buffer.copy(channelBuffer, 1);

    try {
      ws.send(channelBuffer);
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Send terminal resize event
   */
  sendResize(ws, cols, rows) {
    if (ws.readyState !== WebSocket.OPEN) return;

    const resizeData = JSON.stringify({ width: cols, height: rows });
    const buffer = Buffer.from(resizeData, 'utf8');
    const channelBuffer = Buffer.allocUnsafe(1 + buffer.length);
    channelBuffer[0] = SHELL_CHANNELS.TERMINAL_RESIZE;
    buffer.copy(channelBuffer, 1);

    try {
      ws.send(channelBuffer);
    } catch (err) {
      // Ignore resize errors
    }
  }

  /**
   * Start interactive shell session
   */
  async startInteractiveShell(providerBaseUrl, dseq, gseq, oseq, service, jwt) {
    return new Promise((resolve, reject) => {
      // Build WebSocket URL for interactive shell (exactly like frontend)
      const cmd0 = encodeURIComponent("/bin/sh");
      const wsUrl = `wss://${providerBaseUrl}:8443/lease/${dseq}/${gseq}/${oseq}/shell?stdin=1&tty=1&podIndex=0&cmd0=${cmd0}&service=${encodeURIComponent(service)}`;

      console.log(`\x1b[90mConnecting to ${providerBaseUrl}...\x1b[0m`);
      console.log(`\x1b[90mService: ${service}\x1b[0m`);
      console.log(`\x1b[90mDSEQ: ${dseq}\x1b[0m\n`);

      const providerWs = new WebSocket(wsUrl, {
        headers: {
          Authorization: `Bearer ${jwt}`,
          'User-Agent': 'Grid-CLI/1.0'
        },
        rejectUnauthorized: false,
      });


      providerWs.binaryType = "arraybuffer";

      let connected = false;
      let resolved = false;
      let connectionTimeout = null;
      let stdinHandler = null;
      let stdinEndHandler = null;
      let resizeHandler = null;

      const cleanup = () => {
        if (stdinHandler) {
          process.stdin.removeListener('data', stdinHandler);
          stdinHandler = null;
        }

        if (stdinEndHandler) {
          process.stdin.removeListener('end', stdinEndHandler);
          stdinEndHandler = null;
        }

        if (resizeHandler) {
          process.stdout.removeListener('resize', resizeHandler);
          resizeHandler = null;
        }

        if (process.stdin.isTTY) {
          try {
            process.stdin.setRawMode(false);
          } catch (err) { }
        }

        try {
          process.stdin.pause();
        } catch (err) { }

        if (connectionTimeout) clearTimeout(connectionTimeout);

        if (providerWs.readyState === WebSocket.OPEN || providerWs.readyState === WebSocket.CONNECTING) {
          providerWs.close();
        }
      };


      providerWs.on("message", (msg) => {
        let data;

        if (Buffer.isBuffer(msg)) {
          data = msg;
        } else if (msg instanceof ArrayBuffer) {
          data = Buffer.from(msg);
        } else {
          data = Buffer.from(String(msg));
        }

        if (data.length === 0) return;

        const channel = data[0];

        if (channel === SHELL_CHANNELS.STDOUT || channel === SHELL_CHANNELS.STDERR) {
          if (data.length > 1) {
            process.stdout.write(data.subarray(1));
          }
        } else if (channel === SHELL_CHANNELS.RESULT) {
          cleanup();
          if (!resolved) {
            resolved = true;
            resolve();
          }
        } else if (channel === SHELL_CHANNELS.FAILURE) {
          if (data.length > 1) {
            process.stderr.write(data.subarray(1));
          }
          cleanup();
          if (!resolved) {
            resolved = true;
            reject(new Error("Shell session failed"));
          }
        } else if (channel !== SHELL_CHANNELS.TERMINAL_RESIZE) {
          // Unknown channel, treat as output
          process.stdout.write(data);
        }
      });

      providerWs.on("open", () => {
        connected = true;
        console.log(`\x1b[32mConnected! Press Ctrl+D to exit.\x1b[0m\n`);

        // Set raw mode for proper terminal handling
        if (process.stdin.isTTY) {
          try {
            process.stdin.setRawMode(true);
          } catch (err) {
            // Ignore errors setting raw mode
          }
        }

        // Always resume stdin and ref it to keep event loop alive
        process.stdin.resume();
        process.stdin.ref();

        // Send initial terminal size
        if (process.stdout.columns && process.stdout.rows) {
          this.sendResize(providerWs, process.stdout.columns, process.stdout.rows);
        }

        // Handle terminal resize
        resizeHandler = () => {
          this.sendResize(providerWs, process.stdout.columns, process.stdout.rows);
        };
        process.stdout.on('resize', resizeHandler);

        // Handle stdin input (exactly like frontend proxy)
        stdinHandler = (data) => {
          if (!data || (Buffer.isBuffer(data) && data.length === 0)) return;

          let buffer;
          if (Buffer.isBuffer(data)) {
            buffer = data;
          } else if (data instanceof ArrayBuffer) {
            buffer = Buffer.from(data);
          } else if (data instanceof Uint8Array) {
            buffer = Buffer.from(data);
          } else if (typeof data === 'string') {
            buffer = Buffer.from(data, 'utf8');
          } else {
            buffer = Buffer.from(String(data), 'utf8');
          }

          // Handle Ctrl+C (0x03) - send to provider
          if (buffer.length === 1 && buffer[0] === 0x03) {
            const channelBuffer = Buffer.allocUnsafe(1);
            channelBuffer[0] = SHELL_CHANNELS.STDIN;
            if (providerWs.readyState === WebSocket.OPEN) {
              providerWs.send(channelBuffer);
            }
            return;
          }

          // Ctrl+D (0x04) - EOF, exit shell
          if (buffer.length === 1 && buffer[0] === 0x04) {
            const eofBuffer = Buffer.allocUnsafe(1);
            eofBuffer[0] = SHELL_CHANNELS.STDIN;
            if (providerWs.readyState === WebSocket.OPEN) {
              providerWs.send(eofBuffer);
            }
            console.log("\n\x1b[33mExiting shell...\x1b[0m");
            cleanup();
            if (!resolved) {
              resolved = true;
              resolve();
            }
            return;
          }

          // Handle Ctrl+V (paste)
          if (buffer.length === 1 && buffer[0] === 0x16) {
            try {
              let clipboardText = '';
              if (process.platform === 'darwin') {
                clipboardText = execSync('pbpaste', { encoding: 'utf8' });
              } else if (process.platform === 'win32') {
                clipboardText = execSync('powershell -command Get-Clipboard', { encoding: 'utf8' });
              } else {
                clipboardText = execSync('xclip -selection clipboard -o', { encoding: 'utf8' });
              }

              if (clipboardText) {
                this.sendStdinData(providerWs, Buffer.from(clipboardText, 'utf8'));
              }
            } catch (err) {
              // Clipboard not available
            }
            return;
          }

          // Send to provider with channel byte (exactly like frontend)
          if (providerWs.readyState === WebSocket.OPEN) {
            try {
              const channelBuffer = Buffer.allocUnsafe(1 + buffer.length);
              channelBuffer[0] = SHELL_CHANNELS.STDIN;
              buffer.copy(channelBuffer, 1);
              providerWs.send(channelBuffer);
            } catch (err) {
              // Ignore send errors
            }
          }
        };

        process.stdin.on('data', stdinHandler);

        // Handle stdin end (prevents unexpected exit)
        stdinEndHandler = () => {
          if (providerWs.readyState === WebSocket.OPEN) {
            // Send EOF to remote
            const eofBuffer = Buffer.allocUnsafe(1);
            eofBuffer[0] = SHELL_CHANNELS.STDIN;
            providerWs.send(eofBuffer);
          }
        };
        process.stdin.on('end', stdinEndHandler);
      });

      providerWs.on("error", (err) => {
        console.error("\n\x1b[31mConnection error:\x1b[0m", err.message);
        cleanup();
        if (!resolved) {
          resolved = true;
          reject(err);
        }
      });

      providerWs.on("close", (code, reason) => {
        const reasonStr = reason ? reason.toString() : '';
        if (code !== 1000) {
          console.log(`\n\x1b[33mConnection closed (code: ${code}${reasonStr ? ', reason: ' + reasonStr : ''})\x1b[0m`);
        }
        cleanup();
        if (!resolved) {
          resolved = true;
          resolve();
        }
      });

      connectionTimeout = setTimeout(() => {
        if (!connected) {
          console.error("\n\x1b[31mConnection timeout\x1b[0m");
          cleanup();
          if (!resolved) {
            resolved = true;
            reject(new Error("Connection timeout"));
          }
        }
      }, 15000);

      // Handle process signals
      const signalHandler = () => {
        cleanup();
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };
      process.once('SIGINT', signalHandler);
      process.once('SIGTERM', signalHandler);
    });
  }

  /**
   * Execute a single command in the container
   */
  async executeCommand(providerBaseUrl, dseq, gseq, oseq, service, jwt, command) {
    return new Promise((resolve, reject) => {
      // Build command parameters
      const commandParts = command.trim().split(/\s+/);
      const commandParams = commandParts
        .map((c, i) => `&cmd${i}=${encodeURIComponent(c)}`)
        .join("");

      const wsUrl = `wss://${providerBaseUrl}:8443/lease/${dseq}/${gseq}/${oseq}/shell?stdin=1&tty=1&podIndex=0${commandParams}&service=${encodeURIComponent(service)}`;

      console.log(`\x1b[90mExecuting: ${command}\x1b[0m\n`);

      const providerWs = new WebSocket(wsUrl, {
        headers: { Authorization: `Bearer ${jwt}` },
        rejectUnauthorized: false,
      });

      let connected = false;
      let resolved = false;
      let connectionTimeout = null;
      let stdinHandler = null;

      const cleanup = () => {
        if (stdinHandler) {
          process.stdin.removeListener('data', stdinHandler);
          stdinHandler = null;
        }

        if (process.stdin.isTTY) {
          try {
            process.stdin.setRawMode(false);
          } catch (err) { }
        }

        try {
          process.stdin.pause();
        } catch (err) { }

        if (connectionTimeout) clearTimeout(connectionTimeout);

        if (providerWs.readyState === WebSocket.OPEN || providerWs.readyState === WebSocket.CONNECTING) {
          providerWs.close();
        }
      };

      // Set up message handler BEFORE open event
      providerWs.on("message", (msg) => {
        let data = Buffer.isBuffer(msg) ? msg : Buffer.from(msg);
        if (data.length === 0) return;

        const channel = data[0];

        if (channel === SHELL_CHANNELS.STDOUT || channel === SHELL_CHANNELS.STDERR) {
          if (data.length > 1) {
            process.stdout.write(data.subarray(1));
          }
        } else if (channel === SHELL_CHANNELS.RESULT) {
          cleanup();
          if (!resolved) {
            resolved = true;
            resolve();
          }
        } else if (channel === SHELL_CHANNELS.FAILURE) {
          if (data.length > 1) {
            process.stderr.write(data.subarray(1));
          }
          cleanup();
          if (!resolved) {
            resolved = true;
            reject(new Error("Command failed"));
          }
        } else if (channel !== SHELL_CHANNELS.TERMINAL_RESIZE) {
          process.stdout.write(data);
        }
      });

      providerWs.on("open", () => {
        connected = true;

        if (process.stdin.isTTY) {
          try {
            process.stdin.setRawMode(true);
            process.stdin.setEncoding('utf8');
          } catch (err) { }
        }

        if (process.stdin.isPaused()) {
          process.stdin.resume();
        }

        stdinHandler = (data) => {
          if (!data || data.length === 0) return;

          let buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');

          // Ctrl+C - cancel
          if (buffer.length === 1 && buffer[0] === 0x03) {
            console.log("\n\x1b[33mCancelled\x1b[0m");
            cleanup();
            if (!resolved) {
              resolved = true;
              resolve();
            }
            process.exit(0);
            return;
          }

          // Ctrl+D - EOF
          if (buffer.length === 1 && buffer[0] === 0x04) {
            this.sendStdinData(providerWs, Buffer.from([0x04]));
            return;
          }

          this.sendStdinData(providerWs, buffer);
        };

        process.stdin.on('data', stdinHandler);
      });

      providerWs.on("error", (err) => {
        console.error("\n\x1b[31mError:\x1b[0m", err.message);
        cleanup();
        if (!resolved) {
          resolved = true;
          reject(err);
        }
      });

      providerWs.on("close", (code) => {
        cleanup();
        if (!resolved) {
          resolved = true;
          resolve();
        }
      });

      connectionTimeout = setTimeout(() => {
        if (!connected) {
          console.error("\n\x1b[31mConnection timeout\x1b[0m");
          cleanup();
          if (!resolved) {
            resolved = true;
            reject(new Error("Connection timeout"));
          }
        }
      }, 15000);
    });
  }
}