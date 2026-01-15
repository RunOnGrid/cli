import { describe, it, expect } from 'vitest';
import { buildPostgresSDL } from './sdlBuilder.js';
import yaml from 'js-yaml';

describe('buildPostgresSDL', () => {
    it('should generate valid SDL with defaults', () => {
        const params = { rootPassword: 'mysecretpassword' };
        const sdlString = buildPostgresSDL(params);
        const parsed = yaml.load(sdlString);

        expect(parsed.services.postgres.image).toBe('postgres:16');
        expect(parsed.services.postgres.env).toContain('POSTGRES_PASSWORD=mysecretpassword');
        expect(parsed.profiles.compute.postgres.resources.cpu.units).toBe(1);
        expect(parsed.deployment.postgres.dcloud.count).toBe(1);
    });

    it('should correctly configure pgBouncer when enabled', () => {
        const params = {
            rootPassword: 'secret',
            enablePgBouncer: true
        };
        const sdlString = buildPostgresSDL(params);
        const parsed = yaml.load(sdlString);

        expect(parsed.services.pgbouncer).toBeDefined();
        expect(parsed.services.pgbouncer.image).toBe('gridcloud/grid-pgbouncer:1.0');
        expect(parsed.deployment.pgbouncer.dcloud.count).toBe(1);
    });
    it('should correctly configure s3 backups when enabled', () => {
        const params = {
            rootPassword: 'secret',
            enableS3Backup: true
        }
        const sdlString = buildPostgresSDL(params);
        const parsed = yaml.load(sdlString);
        expect(parsed.services.s3backup).toBeDefined();
        expect(parsed.services.s3backup.image).toMatch(/^gridcloud\/s3backups:(2\.6|2\.4)$/);
        expect(parsed.deployment.s3backup.dcloud.count).toBe(1);
    })
});
