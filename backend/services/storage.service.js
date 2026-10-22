
require("dotenv").config();

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const storage = new S3Client({
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

const bucket = process.env.AWS_BUCKET_NAME;

async function uploadFile({ key, buffer, contentType }) {
  await storage.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return { key };
}

async function downloadFile(key) {
  return storage.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

async function deleteFile(key) {
  await storage.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

module.exports = { uploadFile, downloadFile, deleteFile };
