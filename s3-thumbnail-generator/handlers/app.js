const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const sharp = require('sharp');

exports.generateThumbnail = async (event, context) => {
    const bucketName = event.Records[0].s3.bucket.name;  // #TOASK: You could get this from env variables right? How do you do that? Is that the reccomended way?
    const objectKey = event.Records[0].s3.object.key;
    const thumbnailKey = `${objectKey.split(".")[0]}_thumbnail.jpg`;

    // Download the original image from S3
    let originalImage;
    try {
        originalImage = await s3.getObject({
            Bucket: bucketName,
            Key: objectKey
        })
    } catch (error) { // #TOASK: Some way to prevent myself from writing this try-catch all the time? I think asyncWrapper right? But I didn't understand that properly. Could you explain?
        response = {
            statusCode: 500,
            body: error.message,
        };
        return response;
    }

    // Process the image using Sharp
    let thumbnailImage;
    try {
        thumbnailImage = await sharp(originalImage.body)
            .resize({ width: null, height: null, aspectRatio: 1 / 2 })
            .toBuffer()
            .toFormat("jpeg", { mozjpeg: true });
    } catch (error) {
        response = {
            statusCode: 500,
            body: error.message,
        };
        return response;
    }
    // // Reduce the quality setting until the output buffer is below 10KB
    // let quality = 90;
    // while (thumbnailImage.length > 10000 && quality >= 10) {
    //     thumbnailImage = sharp(originalImage.body)
    //         .resize({ width: null, height: null, aspectRatio: 1 / 2 })
    //         .jpeg({ quality: quality })
    //         .toBuffer();
    //     quality -= 10;
    // }

    // Upload the thumbnail to S3
    let putToS3Response;
    try {
        putToS3Response = await s3.putObject({
            Bucket: bucketName,
            Key: thumbnailKey,
            Body: thumbnailImage,
            ContentType: 'image/jpeg'
        });
    } catch (error) {
        response = {
            statusCode: 500,
            body: error.message,
        };

        return response;
    }

    // Return a success response
    const response = {
        statusCode: 200,
        message: 'Thumbnail generated and uploaded successfully',
        body: putToS3Response
    };
    return response;
};
