# Refractometer Image Measuring Tool

## Description

This tool is a refractometer image measuring tool that allows you to measure the values on an image of a refractometer. It uses a webcam stream and applies a Sobel magnitude edge detection algorithm on the greyscale of the image to enhance the edges. You can then use the tool to measure the values on the refractometer image by selecting a region of interest and getting the measurement value.

## Installation

To use the tool, you will need to have [Node.js](https://nodejs.org/) installed. Run the following command in your terminal to install the necessary packages:

```
npm install
```

## Usage

After installation, you can use the following `npm` scripts to run and compile the tool:

- `npm run server`: Starts a local server to run the tool (default port is 80)
- `npm run build`: Compiles the build script for production.
- `npm run watch`: Compiles and watches for changes during development.