require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const csv = require('csv-parser');
const ProgressBar = require('progress');

// OpenAI API details
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';

// Function to clean text
const cleanText = (text) => {
  // Replace non-standard quotes and remove unnecessary whitespace
  return text.replace(/[‘’´`]/g, "'")
             .replace(/[“”]/g, '"')
             .replace(/[\xa0\u2000-\u200F\u2028-\u202F\u205F\u2060\u3000]/g, ' ')
             .replace(/[—–]/g, '-')
             .replace(/\s+/g, ' ')
             .trim();
};

// Function to generate embeddings using OpenAI API
const generateEmbeddings = async (text) => {
  try {
    const response = await axios.post(
      OPENAI_API_URL,
      { input: text },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.data[0].embedding;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    process.exit(1);
  }
};

// Function to preprocess and normalize CSV data
const preprocessCSVData = (data) => {
  // Assuming data is an array of objects
  const keys = Object.keys(data[0]);
  const numericalKeys = keys.filter(key => !isNaN(data[0][key]));

  // Find min and max for each numerical column
  const mins = numericalKeys.map(key => Math.min(...data.map(row => parseFloat(row[key]))));
  const maxes = numericalKeys.map(key => Math.max(...data.map(row => parseFloat(row[key]))));

  // Normalize each numerical column
  data.forEach(row => {
    numericalKeys.forEach((key, index) => {
      row[key] = (parseFloat(row[key]) - mins[index]) / (maxes[index] - mins[index]);
    });
  });

  return data;
};

// Function to process a CSV file
const processCSVFile = async (filePath) => {
  try {
    const data = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        data.push(row);
      })
      .on('end', async () => {
        const preprocessedData = preprocessCSVData(data);
        const bar = new ProgressBar(':bar :current/:total', { total: preprocessedData.length });
        
        for (const row of preprocessedData) {
          const text = cleanText(row['content']); // Assuming 'content' column holds text
          const embeddings = await generateEmbeddings(text);
          bar.tick();
          console.log('Generated Embeddings:', embeddings);
        }
      });
  } catch (error) {
    console.error('Error processing CSV file:', error);
    process.exit(1);
  }
};

// Function to process a JSON file
const processJSONFile = async (filePath) => {
  try {
    const fileContents = fs.readFile('negativa_structured.json', 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading the JSON file:', err);
    return;
  }

    const jsonData = JSON.parse(fileContents);


    // Debug: log the length of jsonData
    console.log('Number of items in JSON:', jsonData.length);

    // Check if jsonData has a 'data' field and it is an array
    if (!jsonData.data || !Array.isArray(jsonData.data)) {
      throw new Error("JSON file format is incorrect. Expected a 'data' field with an array.");
    }
  // Parse the JSON data
  try {
    const jsonData = JSON.parse(data);
    // Assuming the JSON data is an array
    console.log('Number of items in JSON:', jsonData.length);
  } catch (parseErr) {
    console.error('Error parsing JSON data:', parseErr);
  }
});


    // Initialize progress bar with the correct total if jsonData is an array
    const bar = new ProgressBar(':bar :current/:total', { total: Array.isArray(jsonData) ? jsonData.length : 0 });

    // ... rest of the code ...
  } catch (error) {
    console.error('Error processing JSON file:', error);
    process.exit(1);
  }
};

// Main function to determine the file type and start processing
const main = async () => {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('Please specify the file path as an argument.');
    process.exit(1);
  }

  const fileExtension = filePath.split('.').pop();
  if (fileExtension === 'json') {
    await processJSONFile(filePath);
  } else if (fileExtension === 'csv') {
    await processCSVFile(filePath);
  } else {
    console.error('Unsupported file type. Only JSON and CSV files are supported.');
    process.exit(1);
  }
};

main();
