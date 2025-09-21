use anyhow::{anyhow, Result};
use image::{ImageBuffer, RgbImage, DynamicImage};
use std::path::Path;
use std::process::Command;
use log::{info, warn, error};
use serde::{Deserialize, Serialize};
use tauri::api::path::cache_dir;
use tempfile::NamedTempFile;
use std::fs;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OcrResult {
    pub text: String,
    pub confidence: f32,
    pub language: String,
    pub word_count: usize,
    pub processing_time_ms: u64,
    pub source_file: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OcrConfiguration {
    pub languages: Vec<String>,
    pub tesseract_config: String,
    pub confidence_threshold: f32,
    pub preprocessing_enabled: bool,
    pub output_format: String,
}

impl Default for OcrConfiguration {
    fn default() -> Self {
        Self {
            languages: vec!["eng".to_string()],
            tesseract_config: "--psm 3".to_string(),
            confidence_threshold: 70.0,
            preprocessing_enabled: true,
            output_format: "txt".to_string(),
        }
    }
}

pub struct OcrProcessor {
    config: OcrConfiguration,
    tesseract_available: bool,
}

impl OcrProcessor {
    pub fn new(config: OcrConfiguration) -> Self {
        let tesseract_available = Self::check_tesseract_availability();

        if !tesseract_available {
            warn!("Tesseract OCR not found. OCR functionality will be limited.");
        }

        Self {
            config,
            tesseract_available,
        }
    }

    // Check if Tesseract is available on the system
    fn check_tesseract_availability() -> bool {
        match Command::new("tesseract").arg("--version").output() {
            Ok(output) => {
                let version_str = String::from_utf8_lossy(&output.stdout);
                info!("Tesseract OCR found: {}", version_str.lines().next().unwrap_or("Unknown version"));
                true
            }
            Err(_) => {
                warn!("Tesseract OCR not found. Please install Tesseract for OCR functionality.");
                false
            }
        }
    }

    // Preprocess image for better OCR results
    fn preprocess_image(&self, image_path: &Path) -> Result<String> {
        if !self.config.preprocessing_enabled {
            return Ok(image_path.to_string_lossy().to_string());
        }

        // Load image
        let img = image::open(image_path)
            .map_err(|e| anyhow!("Failed to load image: {}", e))?;

        // Convert to grayscale for better OCR
        let grayscale = img.to_luma8();

        // Create temporary file for processed image
        let temp_file = NamedTempFile::new()
            .map_err(|e| anyhow!("Failed to create temp file: {}", e))?;

        let temp_path = temp_file.path().with_extension("png");

        // Save preprocessed image
        grayscale.save(&temp_path)
            .map_err(|e| anyhow!("Failed to save preprocessed image: {}", e))?;

        Ok(temp_path.to_string_lossy().to_string())
    }

    // Extract text from image using Tesseract
    pub async fn extract_text_from_image(&self, image_path: &str) -> Result<OcrResult> {
        if !self.tesseract_available {
            return Err(anyhow!("Tesseract OCR not available"));
        }

        let start_time = std::time::Instant::now();
        let path = Path::new(image_path);

        if !path.exists() {
            return Err(anyhow!("Image file not found: {}", image_path));
        }

        // Preprocess image
        let processed_image_path = self.preprocess_image(path)?;

        // Prepare Tesseract command
        let languages = self.config.languages.join("+");
        let config_args: Vec<&str> = self.config.tesseract_config.split_whitespace().collect();

        // Create temporary output file
        let temp_output = NamedTempFile::new()
            .map_err(|e| anyhow!("Failed to create temp output file: {}", e))?;
        let output_path = temp_output.path().with_extension("txt");

        // Execute Tesseract
        let mut cmd = Command::new("tesseract");
        cmd.arg(&processed_image_path)
            .arg(&output_path.with_extension(""))
            .arg("-l")
            .arg(&languages);

        // Add configuration arguments
        for arg in config_args {
            cmd.arg(arg);
        }

        let output = cmd.output()
            .map_err(|e| anyhow!("Failed to execute Tesseract: {}", e))?;

        if !output.status.success() {
            let error_message = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow!("Tesseract failed: {}", error_message));
        }

        // Read extracted text
        let extracted_text = fs::read_to_string(&output_path)
            .map_err(|e| anyhow!("Failed to read OCR output: {}", e))?;

        let processing_time = start_time.elapsed().as_millis() as u64;
        let word_count = extracted_text.split_whitespace().count();

        // Calculate confidence (simplified - Tesseract can provide actual confidence)
        let confidence = if extracted_text.trim().is_empty() {
            0.0
        } else {
            self.config.confidence_threshold + 20.0 // Simplified confidence calculation
        };

        let result = OcrResult {
            text: extracted_text.trim().to_string(),
            confidence,
            language: languages,
            word_count,
            processing_time_ms: processing_time,
            source_file: image_path.to_string(),
        };

        info!("OCR completed for {}: {} words extracted in {}ms",
              image_path, word_count, processing_time);

        Ok(result)
    }

    // Extract text from PDF (using imagemagick + tesseract approach)
    pub async fn extract_text_from_pdf(&self, pdf_path: &str) -> Result<Vec<OcrResult>> {
        if !self.tesseract_available {
            return Err(anyhow!("Tesseract OCR not available"));
        }

        let path = Path::new(pdf_path);
        if !path.exists() {
            return Err(anyhow!("PDF file not found: {}", pdf_path));
        }

        // Check if ImageMagick is available
        if !Self::check_imagemagick_availability() {
            return Err(anyhow!("ImageMagick not available for PDF processing"));
        }

        // Create temporary directory for page images
        let temp_dir = tempfile::tempdir()
            .map_err(|e| anyhow!("Failed to create temp directory: {}", e))?;

        // Convert PDF pages to images using ImageMagick
        let convert_output = Command::new("magick")
            .arg("convert")
            .arg("-density")
            .arg("300") // High DPI for better OCR
            .arg(pdf_path)
            .arg(temp_dir.path().join("page-%03d.png"))
            .output()
            .map_err(|e| anyhow!("Failed to execute ImageMagick: {}", e))?;

        if !convert_output.status.success() {
            let error_message = String::from_utf8_lossy(&convert_output.stderr);
            return Err(anyhow!("ImageMagick conversion failed: {}", error_message));
        }

        // Process each page image
        let mut results = Vec::new();
        let mut page_num = 0;

        loop {
            let page_image = temp_dir.path().join(format!("page-{:03}.png", page_num));
            if !page_image.exists() {
                break;
            }

            match self.extract_text_from_image(&page_image.to_string_lossy()).await {
                Ok(mut result) => {
                    result.source_file = format!("{}#page-{}", pdf_path, page_num + 1);
                    results.push(result);
                }
                Err(e) => {
                    warn!("Failed to process PDF page {}: {}", page_num + 1, e);
                }
            }

            page_num += 1;
        }

        info!("OCR completed for PDF {}: {} pages processed", pdf_path, results.len());
        Ok(results)
    }

    // Check if ImageMagick is available
    fn check_imagemagick_availability() -> bool {
        Command::new("magick")
            .arg("--version")
            .output()
            .is_ok()
    }

    // Batch process multiple images
    pub async fn batch_process_images(&self, image_paths: Vec<String>) -> Result<Vec<OcrResult>> {
        let mut results = Vec::new();

        for image_path in image_paths {
            match self.extract_text_from_image(&image_path).await {
                Ok(result) => results.push(result),
                Err(e) => {
                    error!("Failed to process image {}: {}", image_path, e);
                    // Continue with other images
                }
            }
        }

        Ok(results)
    }

    // Update configuration
    pub fn update_config(&mut self, new_config: OcrConfiguration) {
        self.config = new_config;
        info!("OCR configuration updated");
    }

    // Get current configuration
    pub fn get_config(&self) -> &OcrConfiguration {
        &self.config
    }

    // Check if OCR is available
    pub fn is_available(&self) -> bool {
        self.tesseract_available
    }
}

// Tauri commands for OCR functionality

#[tauri::command]
pub async fn ocr_extract_text_from_image(
    image_path: String,
    config: Option<OcrConfiguration>
) -> Result<OcrResult, String> {
    let ocr_config = config.unwrap_or_default();
    let processor = OcrProcessor::new(ocr_config);

    processor.extract_text_from_image(&image_path).await
        .map_err(|e| format!("OCR failed: {}", e))
}

#[tauri::command]
pub async fn ocr_extract_text_from_pdf(
    pdf_path: String,
    config: Option<OcrConfiguration>
) -> Result<Vec<OcrResult>, String> {
    let ocr_config = config.unwrap_or_default();
    let processor = OcrProcessor::new(ocr_config);

    processor.extract_text_from_pdf(&pdf_path).await
        .map_err(|e| format!("PDF OCR failed: {}", e))
}

#[tauri::command]
pub async fn ocr_batch_process_images(
    image_paths: Vec<String>,
    config: Option<OcrConfiguration>
) -> Result<Vec<OcrResult>, String> {
    let ocr_config = config.unwrap_or_default();
    let processor = OcrProcessor::new(ocr_config);

    processor.batch_process_images(image_paths).await
        .map_err(|e| format!("Batch OCR failed: {}", e))
}

#[tauri::command]
pub async fn ocr_check_availability() -> Result<bool, String> {
    Ok(OcrProcessor::check_tesseract_availability())
}

#[tauri::command]
pub async fn ocr_get_default_config() -> Result<OcrConfiguration, String> {
    Ok(OcrConfiguration::default())
}

// Initialize OCR system
pub fn init_ocr_system() -> OcrProcessor {
    let config = OcrConfiguration::default();
    OcrProcessor::new(config)
}