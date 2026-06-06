import { Injectable, Logger } from "@nestjs/common";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private s3 = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY!,
      secretAccessKey: process.env.AWS_SECRET_KEY!,
    },
  });

  async uploadFile(
    file: Express.Multer.File,
    folder: string = "products",
  ): Promise<string> {
    const fileName = file.originalname.replace(/\s+/g, "-");
    const key = `${folder}/${Date.now()}-${fileName}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      return `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    } catch (error) {
      this.logger.error(`S3 upload failed for key: ${key}`, error instanceof Error ? error.stack : error);
      throw new Error("File upload failed");
    }
  }

  async deleteFile(fileUrl: string) {
    const key = fileUrl.split(".amazonaws.com/")[1];

    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET!,
        Key: key,
      }),
    );
  }
}
