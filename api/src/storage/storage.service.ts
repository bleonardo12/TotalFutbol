import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";

const EXTENSION_POR_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

interface ArchivoASubir {
  buffer: Buffer;
  mimetype: string;
}

/**
 * Sube evidencia (fotos con nonce, concepto.md §9) a MinIO. El bucket es de
 * lectura publica: las URL usan un UUID impredecible, suficiente para
 * contenido de esta sensibilidad (fotos de un marcador, no datos personales).
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.getOrThrow<string>("MINIO_ENDPOINT");
    const port = this.config.get<number>("MINIO_PORT", 9000);
    const useSsl = this.config.get<string>("MINIO_USE_SSL", "false") === "true";
    this.bucket = this.config.getOrThrow<string>("MINIO_BUCKET_EVIDENCIA");
    const protocolo = useSsl ? "https" : "http";
    this.publicBaseUrl = `${protocolo}://${endpoint}:${port}/${this.bucket}`;

    this.client = new S3Client({
      endpoint: `${protocolo}://${endpoint}:${port}`,
      region: "us-east-1",
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.getOrThrow<string>("MINIO_ACCESS_KEY"),
        secretAccessKey: this.config.getOrThrow<string>("MINIO_SECRET_KEY"),
      },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.asegurarBucket();
  }

  async subir(archivo: ArchivoASubir): Promise<string> {
    const extension = EXTENSION_POR_MIME[archivo.mimetype] ?? "bin";
    const key = `${randomUUID()}.${extension}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: archivo.buffer,
        ContentType: archivo.mimetype,
      }),
    );

    return `${this.publicBaseUrl}/${key}`;
  }

  private async asegurarBucket(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      this.logger.log(`Creando bucket "${this.bucket}" en MinIO`);
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      await this.client.send(
        new PutBucketPolicyCommand({
          Bucket: this.bucket,
          Policy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Principal: "*",
                Action: "s3:GetObject",
                Resource: `arn:aws:s3:::${this.bucket}/*`,
              },
            ],
          }),
        }),
      );
    }
  }
}
