
require("dotenv").config();

const { S3Client, ListObjectsV2Command } =
  require("@aws-sdk/client-s3");

const client = new S3Client({
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

async function main() {
  try {
    await client.send(
      new ListObjectsV2Command({
        Bucket: process.env.AWS_BUCKET_NAME,
        MaxKeys: 1,
      })
    );

    console.log("Neon Object Storage connected successfully!");
  } catch (error) {
    console.error("Storage connection failed:", error.name);
    console.error(error.message);
  }
}

main();
