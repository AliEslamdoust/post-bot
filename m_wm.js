const { exec } = require("child_process");
const sharp = require("sharp");
const log = require("./log");
const path = require("path");

async function watermarkImage(inputImage, watermarkPosition, gravity) {
  try {
    const inputImagePath = path.join(__dirname, `./media/${inputImage}.jpg`);
    const outputImagePath = path.join(
      __dirname,
      `./media/output-${inputImage}.jpg`
    );
    const watermarkImagePath = path.join(__dirname, `./media/watermark.png`);

    const resizedWatermarkBuffer = await sharp(watermarkImagePath)
      .resize(watermarkPosition.width, watermarkPosition.newHeight)
      .toBuffer();

    await sharp(inputImagePath)
      .composite([
        {
          input: resizedWatermarkBuffer,
          gravity,
          top: position.top || undefined,
          left: position.left || undefined,
        },
      ])
      .toFile(outputImagePath);

    setTimer(watermarkImagePath);
    return true;
  } catch (error) {
    log.log_handler("Error adding watermark to image:" + error, "ERROR");
    return false;
  }
}

async function watermarkVideo(videoName, position) {
  return new Promise((resolve, reject) => {
    const inputVideoPath = path.join(__dirname, `./media/${videoName}.mp4`);
    const outputVideoPath = path.join(
      __dirname,
      `./media/output-${videoName}.mp4`
    );
    const watermarkImagePath = path.join(__dirname, `./media/watermark.png`);

    const scale = position.scale || 0.1;

    const ffmpegCommand = `ffmpeg -i "${inputVideoPath}" -i "${watermarkImagePath}" -filter_complex "[1]scale=iw*${scale}:-1[logo];[0][logo]overlay=${
      position.left || "main_w-overlay_w-10"
    }:${
      position.top || "main_h-overlay_h-10"
    }" -c:a copy -c:v libx264 "${outputVideoPath}"`;

    exec(ffmpegCommand, (error, stdout, stderr) => {
      if (error) {
        log.log_handler(`FFmpeg error: ${stderr}`, "ERROR");
        reject(false);
        return;
      }
      setTimer(outputVideoPath);
      resolve(true);
    });
  });
}

async function getImageDimensions(imagePath) {
  try {
    const metadata = await sharp(imagePath).metadata();

    return {
      ok: true,
      width: metadata.width,
      height: metadata.height,
    };
  } catch (error) {
    log.log_handler("Error getting image dimensions: " + error, "ERROR");
    return { ok: false };
  }
}

async function getVideoDimensions(videoPath) {
  return new Promise((resolve, reject) => {
    const ffprobeCommand = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of json "${videoPath}"`;

    exec(ffprobeCommand, (error, stdout, stderr) => {
      if (error) {
        log.log_handler(`FFprobe error: ${stderr}`);
        reject({ ok: false });
        return;
      }

      try {
        const data = JSON.parse(stdout);
        const dimensions = {
          width: data.streams[0].width,
          height: data.streams[0].height,
        };

        resolve({
          ok: true,
          width: dimensions.width,
          height: dimensions.height,
        });
      } catch (parseError) {
        log.log_handler("Error parsing FFprobe output:", parseError);
        reject({ ok: false });
      }
    });
  });
}

async function calculateWatermarkPosition(watermarkPosition, containerMedia) {
  position = { top: 10, left: 10 };
  try {
    const watermarkImagePath = path.join(__dirname, `./media/watermark.png`);
    const watermarkMetadata = await sharp(watermarkImagePath).metadata();

    let newWidth = watermarkMetadata.width;
    let newHeight = watermarkMetadata.height;

    const aspectRatio = newWidth / newHeight;

    const imageSize = {
      width: containerMedia.width,
      height: containerMedia.height,
    };

    if (newHeight > 100) {
      newHeight = 100;
      newWidth = newHeight * aspectRatio;
    }

    newWidth = Math.round(newWidth);
    newHeight = Math.round(newHeight);

    const imageGrid = {
      width: imageSize.width / 3,
      height: imageSize.height / 3,
    };
    position = {
      top: Math.floor((imageGrid.height * 3) / 2) - newHeight / 2,
      left: Math.floor((imageGrid.width * 3) / 2) - newWidth / 2,
      width: newWidth,
      height: newHeight,
      scale: newWidth / watermarkMetadata.width,
    };

    if (watermarkPosition.includes("south")) {
      position.top =
        Math.floor(imageGrid.height * 2 + (imageGrid.height * 2) / 3) -
        newHeight / 2;
    } else if (watermarkPosition.includes("north")) {
      position.top = Math.floor(imageGrid.height / 3);
    }

    if (watermarkPosition.includes("east")) {
      position.left =
        Math.floor(imageGrid.width * 2 + (imageGrid.width * 2) / 3) -
        newWidth / 2;
    } else if (watermarkPosition.includes("west")) {
      position.left = Math.floor(imageGrid.width / 3);
    }
  } catch (err) {
    log.log_handler(
      "Error while processing watermark position: " + err,
      "ERROR"
    );
  } finally {
    return position;
  }
}

function setTimer(filePath) {
  try {
    setTimeout(() => {
      fs.unlink(filePath, (err) => {
        if (err) {
          throw new Error();
        }
      });
    }, 600000);
  } catch (err) {
    setTimer(filePath);
    log.log_handler("Error while deleting files: " + err, "ERROR");
  }
}

module.exports = {
  watermarkImage,
  watermarkVideo,
  getImageDimensions,
  getVideoDimensions,
  calculateWatermarkPosition,
};
