import fs from 'fs';
import path from 'path';
import https from 'https';

const models = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];

const BASE_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
const TARGET_DIR = path.join(process.cwd(), 'public', 'models');

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

const download = (filename) => {
  return new Promise((resolve, reject) => {
    const filePath = path.join(TARGET_DIR, filename);
    const file = fs.createWriteStream(filePath);
    console.log('Downloading ' + filename + '...');
    https.get(BASE_URL + filename, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error('Failed to get ' + filename + ' (' + response.statusCode + ')'));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('Downloaded ' + filename);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
};

(async () => {
  try {
    for (const model of models) {
      await download(model);
    }
    console.log('All models downloaded successfully!');
  } catch (error) {
    console.error('Error downloading models:', error);
  }
})();
