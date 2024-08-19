import AWS from 'aws-sdk'
import {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION,
} from '$env/static/private'

// Configure AWS with your credentials and region
AWS.config.update({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION,
})

const s3 = new AWS.S3()
console.log('--- S3 client ', s3)

export default s3
