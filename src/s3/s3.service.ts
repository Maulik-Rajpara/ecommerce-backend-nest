import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>("AWS_REGION")!;
    this.bucket = this.configService.get<string>("AWS_BUCKET")!;

    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>("AWS_ACCESS_KEY")!,
        secretAccessKey: this.configService.get<string>("AWS_SECRET_KEY")!,
      },
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = "products",
  ): Promise<string> {
    const fileName = file.originalname.replace(/\s+/g, "-");
    const key = `${folder}/${Date.now()}-${fileName}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    } catch (error) {
      this.logger.error(`S3 upload failed for key: ${key}`, error instanceof Error ? error.stack : error);
      throw new Error("File upload failed");
    }
  }

  async deleteFile(fileUrl: string) {
    const key = fileUrl.split(".amazonaws.com/")[1];

    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }
}
