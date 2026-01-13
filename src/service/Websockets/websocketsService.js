import WebSocket from "ws";
import { execSync } from "child_process";

// Códigos de canal según el protocolo de Akash
const SHELL_CHANNELS = {
  STDIN: 104,   // LeaseShellCodeStdin
  STDOUT: 100,  // LeaseShellCodeStdout
  STDERR: 101,  // LeaseShellCodeStderr
  RESULT: 102,  // LeaseShellCodeResult
  FAILURE: 103, // LeaseShellCodeFailure
  TERMINAL_RESIZE: 105 // LeaseShellCodeTerminalResize
};

export class WebSocketClient {
  constructor() {
    const wss = new WebSocket.Server({ noServer: true });
    this.wss = wss;
  }

  /**
   * Envía datos al provider con el byte de canal correcto
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

    // Crear buffer con byte de canal + datos
    const channelBuffer = Buffer.allocUnsafe(1 + buffer.length);
    channelBuffer[0] = SHELL_CHANNELS.STDIN;
    buffer.copy(channelBuffer, 1);

    try {
      ws.send(channelBuffer);
      return true;
    } catch (err) {
      console.error("\nError sending stdin:", err.message);
      return false;
    }
  }

  /**
   * Ejecuta un comando en el contenedor con soporte interactivo
   */
  async executeCommand(
    providerBaseUrl,
    dseq,
    gseq = "1",
    oseq = "1",
    service,
    jwt,
    command
  ) {
    return new Promise((resolve, reject) => {
      // Construir parámetros del comando
      const commandParts = command.trim().split(/\s+/);
      const commandParams = commandParts
        .map((c, i) => `&cmd${i}=${encodeURIComponent(c)}`)
        .join("");

      const wsUrl = `wss://${providerBaseUrl}:8443/lease/${dseq}/${gseq}/${oseq}/shell?stdin=1&tty=1&podIndex=0${commandParams}&service=${encodeURIComponent(service)}`;

      console.log(`Connecting to ${providerBaseUrl}...`);
      console.log(`Executing: ${command}\n`);

      const providerWs = new WebSocket(wsUrl, {
        headers: { Authorization: `Bearer ${jwt}` },
      });

      let connected = false;
      let resolved = false;
      let connectionTimeout = null;
      let stdinHandler = null;
      let outputBuffer = '';

      const cleanup = () => {
        if (stdinHandler) {
          process.stdin.removeListener('data', stdinHandler);
          stdinHandler = null;
        }

        // Siempre restaurar raw mode a false (ya que siempre lo activamos con tty=1)
        if (process.stdin.isTTY) {
          try {
            process.stdin.setRawMode(false);
          } catch (err) {
            // Ignorar errores
          }
        }

        try {
          process.stdin.pause();
        } catch (err) {
          // Ignorar errores
        }

        if (connectionTimeout) clearTimeout(connectionTimeout);

        if (providerWs.readyState === WebSocket.OPEN || providerWs.readyState === WebSocket.CONNECTING) {
          providerWs.close();
        }
      };

      providerWs.on("open", () => {
        connected = true;

        // Siempre activar raw mode porque tty=1 requiere modo interactivo
        if (process.stdin.isTTY) {
          try {
            process.stdin.setRawMode(true);
            process.stdin.setEncoding('utf8');
          } catch (err) {
            console.error("Warning: Could not set raw mode:", err.message);
          }
        }

        if (process.stdin.isPaused()) {
          process.stdin.resume();
        }

        stdinHandler = (data) => {
          if (!data || data.length === 0) return;

          let buffer;
          if (Buffer.isBuffer(data)) {
            buffer = data;
          } else if (typeof data === 'string') {
            buffer = Buffer.from(data, 'utf8');
          } else {
            buffer = Buffer.from(data);
          }

          // Ctrl+C
          if (buffer.length === 1 && buffer[0] === 0x03) {
            console.log("\n\n👋 Cancelling...");
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

          // Detectar Ctrl+V (0x16) o Cmd+V en Mac (secuencia especial)
          // En Linux/Windows: Ctrl+V = 0x16 (22)
          // En Mac: Cmd+V puede venir como secuencia de escape
          if (buffer.length === 1 && buffer[0] === 0x16) {
            // Ctrl+V detectado - leer clipboard y enviar
            try {
              let clipboardText = '';
              if (process.platform === 'darwin') {
                // macOS
                clipboardText = execSync('pbpaste', { encoding: 'utf8' });
              } else if (process.platform === 'win32') {
                // Windows
                clipboardText = execSync('powershell -command Get-Clipboard', { encoding: 'utf8' });
              } else {
                // Linux
                clipboardText = execSync('xclip -selection clipboard -o', { encoding: 'utf8' });
              }
              
              // Enviar cada carácter del texto pegado
              if (clipboardText) {
                const pasteBuffer = Buffer.from(clipboardText, 'utf8');
                for (let i = 0; i < pasteBuffer.length; i++) {
                  this.sendStdinData(providerWs, Buffer.from([pasteBuffer[i]]));
                }
              }
            } catch (err) {
              // Si falla el paste, ignorar silenciosamente
              // O mostrar un mensaje de error
              console.error('\n⚠️  Could not paste from clipboard:', err.message);
            }
            return;
          }

          // Enviar con byte de canal
          this.sendStdinData(providerWs, buffer);
        };

        process.stdin.on('data', stdinHandler);
      });

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
            const output = data.subarray(1);
            process.stdout.write(output);
            
            // Acumular output para detectar prompts de contraseña
            outputBuffer += output.toString('utf8');
            
            // Detectar prompts comunes de contraseña
            const passwordPrompts = [
              /password:/i,
              /enter password:/i,
              /passphrase:/i,
              /sudo.*password/i,
              /\[sudo\] password/i
            ];
            
            const hasPasswordPrompt = passwordPrompts.some(regex => regex.test(outputBuffer));
            
            // Si detectamos un prompt de contraseña, el modo raw ya está activo
            // y los caracteres no se mostrarán automáticamente
            // El provider debería manejar el echo suppression
            
            // Limpiar buffer periódicamente para evitar acumulación
            if (outputBuffer.length > 1000) {
              outputBuffer = outputBuffer.slice(-500);
            }
          }
        } else if (channel === SHELL_CHANNELS.RESULT) {
          if (data.length > 1) {
            try {
              const resultData = data.subarray(1);
              const resultText = resultData.toString('utf8');
              const result = JSON.parse(resultText);
              
              if (result.exit_code !== undefined) {
                cleanup();
                if (!resolved) {
                  resolved = true;
                  resolve();
                }
              }
            } catch (err) {
              process.stdout.write(data.subarray(1));
            }
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
        } else if (channel === SHELL_CHANNELS.TERMINAL_RESIZE) {
          return;
        } else {
          // Compatibilidad: si no hay byte de canal, asumir stdout
          process.stdout.write(data);
        }
      });

      providerWs.on("error", (err) => {
        console.error("\nWebSocket error:", err.message);
        cleanup();
        if (!resolved) {
          resolved = true;
          reject(err);
        }
      });

      providerWs.on("close", (code, reason) => {
        cleanup();
        if (!resolved) {
          resolved = true;
          if (code === 1000) {
            resolve();
          } else {
            reject(new Error(`Connection closed: ${code} - ${reason}`));
          }
        }
      });

      connectionTimeout = setTimeout(() => {
        if (!connected) {
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

