import yaml from "js-yaml";

/**
 * Build PostgreSQL SDL with optional pgbouncer and S3 backup services
 */
export function buildPostgresSDL(params) {
  const {
    rootPassword,
    cpu = 1,
    memory = 1024,
    storage = 10,
    port = 5432,
    version = "16",
    enablePersistence = true,
    persistenceClass = "beta3",
    enablePgBouncer = false,
    pgBouncerPort = 6432,
    enableS3Backup = false,
    s3Config = {},
  } = params;

  const serviceKey = "postgres";

  // Build exposure targets for postgres
  const postgresExposeTo = [{ global: true }];
  if (enableS3Backup) {
    postgresExposeTo.push({ service: "s3backup" });
  }
  if (enablePgBouncer) {
    postgresExposeTo.push({ service: "pgbouncer" });
  }

  // PostgreSQL service
  const services = {
    [serviceKey]: {
      image: `postgres:${version}`,
      expose: [{ port, to: postgresExposeTo }],
      env: [
        "PGDATA=/var/lib/postgresql/data/pgdata",
        "POSTGRES_USER=admin",
        `POSTGRES_PASSWORD=${rootPassword}`,
        "POSTGRES_DB=mydb",
        "POSTGRES_INITDB_ARGS=--auth-host=scram-sha-256 --auth-local=scram-sha-256",
      ],
    },
  };

  // Add persistence params if enabled
  if (enablePersistence) {
    services[serviceKey].params = {
      storage: {
        data: {
          mount: "/var/lib/postgresql/data",
          readOnly: false,
        },
      },
    };
  }

  // Build storage config
  const storageConfig = enablePersistence
    ? [
      { size: "1Gi" },
      {
        name: "data",
        size: `${storage}Gi`,
        attributes: {
          persistent: true,
          class: persistenceClass,
        },
      },
    ]
    : [{ size: `${storage}Gi` }];

  // Profiles
  const profiles = {
    compute: {
      [serviceKey]: {
        resources: {
          cpu: { units: cpu },
          memory: { size: `${memory}Mi` },
          storage: storageConfig,
        },
      },
    },
    placement: {
      dcloud: {
        pricing: {
          [serviceKey]: { denom: "uakt", amount: 100000 },
        },
      },
    },
  };

  // Deployment
  const deployment = {
    [serviceKey]: {
      dcloud: { profile: serviceKey, count: 1 },
    },
  };

  // Add S3 backup service if enabled
  if (enableS3Backup) {
    const s3Version = getS3BackupVersion(version);

    services.s3backup = {
      image: `gridcloud/s3backups:${s3Version}`,
      expose: [{ port: 8080, to: [{ global: false }] }],
      env: [
        `AWS_ACCESS_KEY_ID=${s3Config.awsAccessKeyId || ""}`,
        `AWS_SECRET_ACCESS_KEY=${s3Config.awsSecretAccessKey || ""}`,
        `AWS_S3_BUCKET=${s3Config.s3Bucket || ""}`,
        `AWS_S3_REGION=${s3Config.s3Region || "us-east-2"}`,
        `DB_HOST=${serviceKey}`,
        `DB_PORT=${port}`,
        `DB_USER=${s3Config.dbUser || "admin"}`,
        `DB_PASSWORD=${s3Config.dbPassword || rootPassword}`,
        `DB_NAME=${s3Config.dbName || "mydb"}`,
        `BACKUP_CRON_SCHEDULE=${s3Config.backupCronSchedule || "0 5 * * *"}`,
        `RUN_ON_STARTUP=false`,
        `BACKUP_FILE_PREFIX=backup`,
      ],
    };

    profiles.compute.s3backup = {
      resources: {
        cpu: { units: 0.5 },
        memory: { size: "512Mi" },
        storage: [{ size: "1Gi" }],
      },
    };

    profiles.placement.dcloud.pricing.s3backup = {
      denom: "uakt",
      amount: 50000,
    };

    deployment.s3backup = {
      dcloud: { profile: "s3backup", count: 1 },
    };
  }

  // Add pgBouncer service if enabled
  if (enablePgBouncer) {
    services.pgbouncer = {
      image: "gridcloud/grid-pgbouncer:1.0",
      expose: [{ port: pgBouncerPort, to: [{ global: true }] }],
      params: {
        storage: {
          ssl: {
            mount: "/etc/pgbouncer/ssl",
            readOnly: false,
          },
        },
      },
      env: [
        "SERVER_TLS_SSLMODE=verify-full",
        "SERVER_TLS_CA_FILE=/etc/pgbouncer/ssl/ca.crt",
        "SERVER_TLS_CERT_FILE=/etc/pgbouncer/ssl/pgbouncer.crt",
        "SERVER_TLS_KEY_FILE=/etc/pgbouncer/ssl/pgbouncer.key",
        `DB_HOST=${serviceKey}`,
        `DB_PORT=${port}`,
        "DB_NAME=mydb",
        "DB_USER=admin",
        `DB_PASSWORD=${rootPassword}`,
        `LISTEN_PORT=${pgBouncerPort}`,
        "AUTH_TYPE=scram-sha-256",
      ],
    };

    profiles.compute.pgbouncer = {
      resources: {
        cpu: { units: 0.25 },
        memory: { size: "256Mi" },
        storage: [
          { size: "512Mi" },
          {
            name: "ssl",
            size: "1Gi",
            attributes: {
              persistent: true,
              class: persistenceClass,
            },
          },
        ],
      },
    };

    profiles.placement.dcloud.pricing.pgbouncer = {
      denom: "uakt",
      amount: 25000,
    };

    deployment.pgbouncer = {
      dcloud: { profile: "pgbouncer", count: 1 },
    };
  }

  // Build complete SDL structure
  const sdl = {
    version: "2.0",
    services,
    profiles,
    deployment,
  };

  return yaml.dump(sdl).trim();
}

/**
 * Get S3 backup image version based on PostgreSQL version
 */
function getS3BackupVersion(pgVersion) {
  if (pgVersion === "17") {
    return "2.4";
  }
  return "2.6";
}

export default { buildPostgresSDL };
