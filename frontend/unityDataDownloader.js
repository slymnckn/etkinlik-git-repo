// unityDataDownloader.js - Sadeleştirilmiş versiyon

const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// KONFIGURASYON
const UNITY_BUILD_PATH = process.env.UNITY_BUILD_PATH || './UnityBuild';
const STREAMING_ASSETS_PATH = path.join(UNITY_BUILD_PATH, 'StreamingAssets', process.env.CODE);
const PORT = process.env.PORT || 3000;

// API URL'leri
const QUESTION_API_URL = 'https://etkinlik.app/api/unity/question-groups/code/';

// Klasör oluşturma yardımcı fonksiyonu
async function ensureDirectoryExists(directoryPath) {
    try {
        await fs.mkdir(directoryPath, { recursive: true });
        console.log(`Klasör oluşturuldu veya zaten var: ${directoryPath}`);
    } catch (error) {
        console.error(`Klasör oluşturulamadı: ${directoryPath}`, error);
        throw error;
    }
}

// API yanıtını işleme fonksiyonu
function processApiResponse(jsonResponse) {
    const apiResponse = JSON.parse(jsonResponse);
    if (!apiResponse || !apiResponse.questions) {
        throw new Error("Geçersiz veri formatı");
    }

    const logoURL = apiResponse.logo_url 
    || apiResponse.publisher?.logo_url 
    || apiResponse.image_url 
    || null;
    console.log("Logo URL from API:", logoURL);

    
    const questionType = determineQuestionType(apiResponse.question_type);

    const questionsInfo = {
        questionType: questionType,
        questions: []
    };
   
    const BASE_URL = "https://etkinlik.app/storage/public/questions/";
    
    apiResponse.questions.forEach(apiQuestion => {
        const cleanedPath = apiQuestion.image_path
        ? apiQuestion.image_path.replace(BASE_URL, "")
        : "";
		
		console.log(`First imagePath:     ${apiQuestion.image_path}  `);
        
		const question = {
            questionText: apiQuestion.question_text,
			hasImage: !!apiQuestion.image_path,
            imagePath: apiQuestion.image_path || "" ,
			categoryId: apiQuestion.category_id
        };
		
		console.log(`DEBUG - Final imagePath: ${question.imagePath}`);

        const answers = [];
        let correctIndex = -1;

        apiQuestion.answers.forEach((answer, i) => {
            answers.push(answer.answer_text);
            if (answer.is_correct) {
                correctIndex = i;
            }
        });

        question.answersText = answers;
        question.correctAnswerId = correctIndex;
        questionsInfo.questions.push(question);
    });

    return { questionsInfo, logoURL };
}

// Soru tipini belirler
function determineQuestionType(apiQuestionType) {
    switch (apiQuestionType.toLowerCase()) {
        case "multiple_choice":
            return 0;
        case "true_false":
            return 1;
        case "qa":
            return 2;
        default:
            return 0; // Default to multiple choice
    }
}

// Resim dosyası indirme fonksiyonu
async function downloadImage(imageUrl, outputPath) {
    try {
        console.log(`İndiriliyor: ${imageUrl}`);
        const response = await axios({
            url: imageUrl,
            method: 'GET',
            responseType: 'arraybuffer'
        });

        await fs.writeFile(outputPath, Buffer.from(response.data));
        console.log(`Resim kaydedildi: ${outputPath}`);
        return true;
    } catch (error) {
        console.error(`Resim indirilemedi: ${imageUrl}`, error.message);
        return false;
    }
}

// URL'den dosya adını çıkarır
function getImageKeyFromPath(path) {
    if (!path) return 'unknown';
    const fileName = path.split('/').pop().split('.')[0];
    return fileName.replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/İ/g, 'I');
}

// Ana işlem endpoint'i
app.post('/process-questions', async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ success: false, message: "Soru kodu gerekli" });
        }

        console.log(`Kod: ${code} için işlem başlatılıyor...`);

        // StreamingAssets klasörünü oluştur
        await ensureDirectoryExists(STREAMING_ASSETS_PATH);

        // Alt klasörleri oluştur
        const questionsDir = path.join(STREAMING_ASSETS_PATH, 'Questions');
        const imagesDir = path.join(STREAMING_ASSETS_PATH, 'Images');
        const logoDir = path.join(STREAMING_ASSETS_PATH, 'Logo');

        await Promise.all([
            ensureDirectoryExists(questionsDir),
            ensureDirectoryExists(imagesDir),
            ensureDirectoryExists(logoDir)
        ]);

        // Soruları indir
        console.log("Sorular indiriliyor...");
        const response = await axios.get(`${QUESTION_API_URL}${code}`);

        // API yanıtını işle
        const { questionsInfo, logoURL } = processApiResponse(JSON.stringify(response.data));

        // Soruları kaydet
        const questionsFilePath = path.join(questionsDir, `QuestionsData.json`);
        await fs.writeFile(questionsFilePath, JSON.stringify(questionsInfo, null, 2));
        console.log(`Sorular kaydedildi: ${questionsFilePath}`);

        // Logo indir
        if (logoURL) {
            const logoFileName = `logo.png`;
            const logoFilePath = path.join(logoDir, logoFileName);
            await downloadImage(logoURL, logoFilePath);
        }

        // Tüm resimleri indir
        console.log("Soru resimleri indiriliyor...");
        let downloadedImageCount = 0;

        for (const question of questionsInfo.questions) {
            if (question.hasImage && question.imagePath) {
                const imageFileName = `${getImageKeyFromPath(question.imagePath)}.png`;
                const imageFilePath = path.join(imagesDir, imageFileName);

                const success = await downloadImage(question.imagePath, imageFilePath);
                if (success) {
                    downloadedImageCount++;
                }
            }
        }

        console.log(`Toplam ${downloadedImageCount} soru resmi indirildi ve kaydedildi.`);

        // Güncellenen soru bilgisini kaydet
        await fs.writeFile(questionsFilePath, JSON.stringify(questionsInfo, null, 2), { encoding: 'utf8' });

        res.json({
            success: true,
            message: `İşlem tamamlandı. ${questionsInfo.questions.length} soru, ${downloadedImageCount} resim işlendi ve kaydedildi.`
        });

    } catch (error) {
        console.error("İşlem sırasında hata:", error);
        res.status(500).json({
            success: false,
            message: `Hata: ${error.message}`
        });
    }
});

// API'nin canlı olduğunu kontrol etmek için basit bir endpoint
app.get('/', (req, res) => {
    res.send('Unity Data Downloader API çalışıyor. POST /process-questions endpoint\'ini kullanabilirsiniz.');
});

// Sunucuyu başlat
app.listen(PORT, () => {
    console.log(`Sunucu başlatıldı: http://localhost:${PORT}`);
    console.log(`Unity build klasörü: ${UNITY_BUILD_PATH}`);
    console.log(`StreamingAssets klasörü: ${STREAMING_ASSETS_PATH}`);
});