const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const sharp = require('sharp');

let response;

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

    // #TOASK: I could break the below stuff down into a function but then how do I sure that I return from that and this at the same time if some error occurs?
    // Process the image using Sharp
    let thumbnailImage;
    try {
        //Processing once to change aspect ratio
        thumbnailImage = await sharp(originalImage)
            // #TOASK: Is setting the width and height to hardcoded values like this the right thing to do?
            .resize({
                width: 1000, // set the width to 1000 pixels
                height: 500, // set the height to half of the width (1:2 aspect ratio)
                fit: 'fill', // specify how to fit the image in case it doesn't have the exact aspect ratio
                position: 'center' // specify where to position the image if there's any whitespace
            })
            .toFormat("jpeg", { mozjpeg: true })
            .toBuffer();

        // Reduce the quality setting until the output buffer is below 10KB
        let outputQuality = 100;
        while (thumbnailImage.length > 30000 && outputQuality >= 10) {
            thumbnailImage = await sharp(originalImage)
                .toFormat("jpeg", { mozjpeg: true })
                .jpeg({ quality: outputQuality })
                .toBuffer();
            outputQuality -= 10;
        }
        // #TOASK: How do we prevent larger files from being uploaded like we did earlier? Using form-data can we upload to S3? I think we should be able to.
        //Throwing an error if after proccessing still image is large
        if (thumbnailImage.length > 30000) {
            response = {
                statusCode: 500,
                body: `Can't reduce size even after appreciable quality drop. Please upload a smaller input image`,
            };
        }
    } catch (error) {
        response = {
            statusCode: 500,
            body: error.message,
        };
        return response;
    }

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