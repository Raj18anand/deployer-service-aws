// import { S3 } from "aws-sdk";
const { S3Client, ListObjectsCommand, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
import fs from "fs";
import path from "path";

const s3 = new S3Client({
    region: 'ap-south-1',
  credentials: {
    //@ts-ignore
    accessKeyId: 'ACCESS_KEY',
    //@ts-ignore
    secretAccessKey: 'SECRET_ACCESS_KEY',
  },
})

// output/asdasd
export async function downloadS3Folder(prefix: string) {
    const allFiles = await s3.send(new ListObjectsCommand({
        Bucket: "deployitnow",
        Prefix: prefix
    }));
    //@ts-ignore 
    const allPromises = allFiles.Contents?.map(async({Key}) => {
        
        //@ts-ignore
        return new Promise(async (resolve) => {
            if (!Key) {
                resolve("");
                return;
            }
            const finalOutputPath = path.join(__dirname, Key);
            const outputFile = fs.createWriteStream(finalOutputPath);
            const dirName = path.dirname(finalOutputPath);
            if (!fs.existsSync(dirName)){
                fs.mkdirSync(dirName, { recursive: true });
            }

            s3.send(new GetObjectCommand({
                Bucket: "deployitnow",
                Key
            }))
            //@ts-ignore
            .then(data => {
                data.Body.pipe(outputFile);
                outputFile.on("finish", () => {
                    resolve("");
                });
                outputFile.on("error", err => {
                    console.error(err);
                });
            })
            //@ts-ignore
            .catch(err => {
                console.error("Error downloading file from S3:", err);
            });
        })
    }) || []
    console.log("awaiting");
    //@ts-ignore
    await Promise.all(allPromises?.filter(x => x !== undefined));
}

export function copyFinalDist(id: string) {
    const folderPath = path.join(__dirname, `output/${id}/build`);
    const allFiles = getAllFiles(folderPath);
    
    allFiles.forEach(file => {
        let tempPath=file.slice(folderPath.length + 1);
        let replacedString =tempPath.split('\\').join('/');
        uploadFile(`dist/${id}/` + replacedString, file);
    })
}

const getAllFiles = (folderPath: string) => {
    let response: string[] = [];

    const allFilesAndFolders = fs.readdirSync(folderPath);allFilesAndFolders.forEach(file => {
        const fullFilePath = path.join(folderPath, file);
        if (fs.statSync(fullFilePath).isDirectory()) {
            response = response.concat(getAllFiles(fullFilePath))
        } else {
            response.push(fullFilePath);
        }
    });
    return response;
}

const uploadFile = async (fileName: string, localFilePath: string) => {
    const fileContent = fs.readFileSync(localFilePath);
    const response = await s3.send(new PutObjectCommand({
        Body: fileContent,
        Bucket: "deployitnow",
        Key: fileName,
    }));
    console.log(response);
}
