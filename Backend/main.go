package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/gin-gonic/gin"
	"github.com/google/generative-ai-go/genai"
	"github.com/joho/godotenv"
	"google.golang.org/api/option"
)

var (
	s3Client     *s3.Client
	geminiClient *genai.Client
)

type FlaskResponse struct {
	Categories []string `json:"categories"`
}

type AnalysisResponse struct {
	Resalable struct {
		IsResalable bool     `json:"is_resalable"`
		Platforms   []string `json:"platforms"`
		Condition   string   `json:"condition"`
		Value       string   `json:"value"`
		Tips        string   `json:"tips"`
	} `json:"resalable"`
	Recyclable struct {
		IsRecyclable bool     `json:"is_recyclable"`
		Centers      []string `json:"centers"`
		Material     string   `json:"material"`
		Process      string   `json:"process"`
		Impact       string   `json:"impact"`
	} `json:"recyclable"`
	Reusable struct {
		IsReusable bool     `json:"is_reusable"`
		Ways       []string `json:"ways"`
		Durability string   `json:"durability"`
		Benefits   string   `json:"benefits"`
		Tutorial   string   `json:"tutorial"`
	} `json:"reusable"`
	CarbonFootprint struct {
		Production    string   `json:"production"`
		Usage         string   `json:"usage"`
		Disposal      string   `json:"disposal"`
		TotalEstimate string   `json:"total_estimate"`
		ReductionTips []string `json:"reduction_tips"`
	} `json:"carbon_footprint"`
	Biodegradable bool   `json:"biodegradable"`
	TimeToDegrade string `json:"time_to_degrade"`
	Description   string `json:"description"`
}

func init() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: Error loading .env file. Using environment variables.")
	}

	// Initialize AWS S3 client
	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion(os.Getenv("AWS_REGION")),
	)
	if err != nil {
		log.Fatal("AWS config error:", err)
	}
	s3Client = s3.NewFromConfig(cfg)

	// Initialize Gemini client
	ctx := context.Background()
	geminiClient, err = genai.NewClient(ctx, option.WithAPIKey(os.Getenv("GEMINI_API_KEY")))
	if err != nil {
		log.Fatal("Gemini client error:", err)
	}
}

func main() {
	r := gin.Default()

	// Enable CORS
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Regular upload endpoint (stores in S3)
	r.POST("/upload", handleUpload)

	// Analysis endpoint (uses Gemini)
	r.POST("/analyze", handleAnalyze)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server running on port %s", port)
	log.Fatal(r.Run(":" + port))
}

func handleUpload(c *gin.Context) {
	// Get the file from the request
	file, header, err := c.Request.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to get file from request: " + err.Error()})
		return
	}
	defer file.Close()

	// Generate a unique filename
	filename := time.Now().Format("20060102150405") + "-" + header.Filename

	// Upload to S3
	bucketName := os.Getenv("S3_BUCKET_NAME")
	if bucketName == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "S3_BUCKET_NAME not set in environment"})
		return
	}

	_, err = s3Client.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket: &bucketName,
		Key:    &filename,
		Body:   file,
	})
	if err != nil {
		log.Printf("S3 upload error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload to S3: " + err.Error()})
		return
	}

	// Generate the S3 URL
	url := "https://" + bucketName + ".s3." + os.Getenv("AWS_REGION") + ".amazonaws.com/" + filename

	c.JSON(http.StatusOK, gin.H{
		"message": "File uploaded successfully",
		"url":     url,
	})
}

func handleAnalyze(c *gin.Context) {
	// Get the file from the request
	file, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to get file from request: " + err.Error()})
		return
	}

	// Read the file
	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open file: " + err.Error()})
		return
	}
	defer src.Close()

	// Read the file content
	imageData, err := io.ReadAll(src)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file: " + err.Error()})
		return
	}

	log.Printf("Processing image: %s (size: %d bytes)", file.Filename, len(imageData))

	// Get categories from Flask server
	flaskResponse, err := getCategoriesFromFlask(imageData)
	if err != nil {
		log.Printf("Warning: Flask server error: %v", err)
		flaskResponse = &FlaskResponse{
			Categories: []string{"general waste"},
		}
	}

	log.Printf("Categories from Flask: %v", flaskResponse.Categories)

	// Analyze with Gemini
	analysisResponse, err := analyzeWithGemini(flaskResponse.Categories, imageData)
	if err != nil {
		log.Printf("Gemini analysis error: %v", err)
		c.JSON(http.StatusOK, gin.H{
			"message": "Analysis completed with limited results",
			"analysis": AnalysisResponse{
				Resalable: struct {
					IsResalable bool     `json:"is_resalable"`
					Platforms   []string `json:"platforms"`
					Condition   string   `json:"condition"`
					Value       string   `json:"value"`
					Tips        string   `json:"tips"`
				}{
					IsResalable: false,
					Platforms:   []string{"Analysis unavailable"},
					Condition:   "Unknown",
					Value:       "Unknown",
					Tips:        "Analysis unavailable",
				},
				Recyclable: struct {
					IsRecyclable bool     `json:"is_recyclable"`
					Centers      []string `json:"centers"`
					Material     string   `json:"material"`
					Process      string   `json:"process"`
					Impact       string   `json:"impact"`
				}{
					IsRecyclable: false,
					Centers:      []string{"Please check local centers"},
					Material:     "Unknown",
					Process:      "Unknown",
					Impact:       "Unknown",
				},
				Reusable: struct {
					IsReusable bool     `json:"is_reusable"`
					Ways       []string `json:"ways"`
					Durability string   `json:"durability"`
					Benefits   string   `json:"benefits"`
					Tutorial   string   `json:"tutorial"`
				}{
					IsReusable: false,
					Ways:       []string{"Analysis unavailable"},
					Durability: "Unknown",
					Benefits:   "Unknown",
					Tutorial:   "Analysis unavailable",
				},
				CarbonFootprint: struct {
					Production    string   `json:"production"`
					Usage         string   `json:"usage"`
					Disposal      string   `json:"disposal"`
					TotalEstimate string   `json:"total_estimate"`
					ReductionTips []string `json:"reduction_tips"`
				}{
					Production:    "Unknown",
					Usage:         "Unknown",
					Disposal:      "Unknown",
					TotalEstimate: "Unknown",
					ReductionTips: []string{"Analysis unavailable"},
				},
				Biodegradable: false,
				TimeToDegrade: "Unknown",
				Description:   "Analysis unavailable",
			},
			"categories": flaskResponse.Categories,
		})
		return
	}

	// Print the analysis response
	analysisJSON, _ := json.MarshalIndent(analysisResponse, "", "  ")
	log.Printf("Gemini Analysis Response:\n%s", string(analysisJSON))

	// Return successful response
	c.JSON(http.StatusOK, gin.H{
		"message":    "Analysis completed successfully",
		"analysis":   analysisResponse,
		"categories": flaskResponse.Categories,
	})
}

func getCategoriesFromFlask(imageData []byte) (*FlaskResponse, error) {
	// Create multipart form data
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("image", "image.jpg")
	if err != nil {
		return nil, err
	}

	if _, err := part.Write(imageData); err != nil {
		return nil, err
	}
	if err := writer.Close(); err != nil {
		return nil, err
	}

	// Send request to Flask server
	resp, err := http.Post(
		os.Getenv("FLASK_SERVER_URL")+"/analyze",
		writer.FormDataContentType(),
		body,
	)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var flaskResponse FlaskResponse
	if err := json.NewDecoder(resp.Body).Decode(&flaskResponse); err != nil {
		return nil, err
	}

	return &flaskResponse, nil
}

func analyzeWithGemini(categories []string, imageData []byte) (*AnalysisResponse, error) {
	ctx := context.Background()
	model := geminiClient.GenerativeModel("gemini-2.0-flash")

	// Prepare a strict JSON template prompt
	prompt := fmt.Sprintf(`Analyze this image and the following waste categories: %v

Respond with ONLY a JSON object in this exact format:
{
	"resalable": {
		"is_resalable": true/false,
		"platforms": ["platform1", "platform2"],
		"condition": "Detailed description of item condition",
		"value": "Estimated value range",
		"tips": "Tips for successful resale"
	},
	"recyclable": {
		"is_recyclable": true/false,
		"centers": ["center1", "center2"],
		"material": "Detailed material composition",
		"process": "How this item is recycled",
		"impact": "Environmental impact of recycling this item"
	},
	"reusable": {
		"is_reusable": true/false,
		"ways": ["way1", "way2"],
		"durability": "Expected durability for reuse",
		"benefits": "Benefits of reusing this item",
		"tutorial": "Brief steps for repurposing"
	},
	"carbon_footprint": {
		"production": "Estimated carbon footprint from production",
		"usage": "Estimated carbon footprint from usage",
		"disposal": "Estimated carbon footprint from disposal",
		"total_estimate": "Total carbon footprint estimate",
		"reduction_tips": ["tip1", "tip2"]
	},
	"biodegradable": true/false,
	"time_to_degrade": "Estimated time to biodegrade",
	"description": "Comprehensive description of the item and its sustainability aspects"
}

Guidelines:
1. For resalable items:
   - Suggest real platforms like OLX, Quickr, or Facebook Marketplace
   - Provide realistic value estimates
   - Include condition assessment and selling tips

2. For recyclable items:
   - Only list real recycling centers in Chaithanya Layout, 8th Phase, J. P. Nagar, Bengaluru
   - Detail the material composition
   - Explain the recycling process and environmental benefits

3. For reusable items:
   - Suggest practical and creative ways to reuse
   - Include durability assessment
   - Provide step-by-step repurposing guidance

4. For carbon footprint:
   - Provide realistic estimates for production, usage, and disposal
   - Express total carbon footprint in kg of CO2 equivalent
   - Suggest actionable tips to reduce the carbon footprint
   - Consider the item's entire lifecycle

5. For biodegradable assessment:
   - Base on material composition
   - Include realistic degradation timeframe
   - Explain environmental impact

Provide detailed, practical information that would be helpful for users making sustainable decisions.
DO NOT add any text before or after the JSON.`, categories)

	log.Printf("Sending prompt to Gemini:\n%s", prompt)

	// Create image data with proper MIME type
	imgData := genai.ImageData("image/jpeg", imageData)

	// Generate content
	resp, err := model.GenerateContent(ctx, genai.Text(prompt), imgData)
	if err != nil {
		return nil, fmt.Errorf("failed to generate content: %v", err)
	}

	if len(resp.Candidates) == 0 {
		return nil, fmt.Errorf("no response generated from Gemini")
	}

	// Get response text and ensure it's a string
	responseText := string(resp.Candidates[0].Content.Parts[0].(genai.Text))
	log.Printf("Raw Gemini Response:\n%s", responseText)

	// Try to find JSON content
	start := strings.Index(responseText, "{")
	end := strings.LastIndex(responseText, "}")
	if start >= 0 && end >= 0 && end > start {
		responseText = responseText[start : end+1]
		log.Printf("Extracted JSON:\n%s", responseText)
	}

	// Parse the response into our AnalysisResponse struct
	var analysisResponse AnalysisResponse
	if err := json.Unmarshal([]byte(responseText), &analysisResponse); err != nil {
		return nil, fmt.Errorf("failed to parse response: %v\nResponse text: %s", err, responseText)
	}

	return &analysisResponse, nil
}