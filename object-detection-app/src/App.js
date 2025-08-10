import React, { useRef, useEffect, useState } from "react";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";
import styled from "styled-components";

const Container = styled.div`
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  background: #1e1e2f;
  color: white;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const VideoContainer = styled.div`
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: black;
`;

const StyledVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const StyledCanvas = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
`;

const InfoBar = styled.div`
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 10;
  font-size: 16px;
  color: #00ffffcc;
  background: rgba(0, 0, 0, 0.7);
  padding: 10px 15px;
  border-radius: 8px;
  backdrop-filter: blur(10px);
`;

const Title = styled.h1`
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10;
  margin: 0;
  font-size: 24px;
  color: #00ffff;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
`;

const Button = styled.button`
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  padding: 12px 24px;
  font-weight: 600;
  border-radius: 8px;
  border: none;
  background: #00ffff;
  color: #111;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  
  &:hover {
    background: #00cccc;
    transform: translateX(-50%) scale(1.05);
  }
`;

// Add global styles to remove default margins/padding
const GlobalStyle = styled.div`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body, html {
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
`;

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [model, setModel] = useState(null);
  const [videoReady, setVideoReady] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [fps, setFps] = useState(0);
  const [objectCount, setObjectCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    cocoSsd.load().then((loadedModel) => {
      setModel(loadedModel);
    });
  }, []);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ 
        video: { 
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      })
      .then((stream) => {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      })
      .catch((err) => {
        console.error("Error accessing webcam: ", err);
      });
  }, []);

  const handleVideoLoadedMetadata = () => {
    setVideoReady(true);
  };

  useEffect(() => {
    if (model && videoReady && !detecting) {
      setDetecting(true);
      detectFrame();
    }
  }, [model, videoReady, detecting]);

  // For FPS calculation
  let lastTime = performance.now();

  const detectFrame = () => {
    model.detect(videoRef.current).then((predictions) => {
      drawPredictions(predictions);

      // Calculate FPS
      const now = performance.now();
      const delta = now - lastTime;
      lastTime = now;
      setFps(Math.round(1000 / delta));

      setObjectCount(predictions.length);
      requestAnimationFrame(detectFrame);
    });
  };

  const drawPredictions = (predictions) => {
    const ctx = canvasRef.current.getContext("2d");
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    predictions.forEach((prediction) => {
      const [x, y, width, height] = prediction.bbox;
      ctx.strokeStyle = "#00FFFF";
      ctx.lineWidth = 3; // Slightly thicker for fullscreen
      ctx.fillStyle = "rgba(0, 255, 255, 0.25)";
      ctx.fillRect(x, y, width, height);

      ctx.font = "20px Arial"; // Larger font for fullscreen
      ctx.fillStyle = "#00FFFF";
      const text = `${prediction.class} - ${(prediction.score * 100).toFixed(1)}%`;

      const textWidth = ctx.measureText(text).width;
      const textHeight = 20;

      ctx.fillRect(x, y - textHeight, textWidth + 8, textHeight);
      ctx.fillStyle = "#000";
      ctx.fillText(text, x + 4, y - 2);
      ctx.strokeRect(x, y, width, height);
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  return (
    <>
      <GlobalStyle />
      <Container>
        <Title>Real-Time Object Detection</Title>
        
        <VideoContainer>
          <StyledVideo
            ref={videoRef}
            onLoadedMetadata={handleVideoLoadedMetadata}
            playsInline
            muted
            autoPlay
          />
          <StyledCanvas ref={canvasRef} />
        </VideoContainer>

        <InfoBar>
          {model ? (
            <>
              <div>FPS: {fps}</div>
              <div>Objects: {objectCount}</div>
              <div>Status: {detecting ? 'Detecting' : 'Standby'}</div>
            </>
          ) : (
            <div>Loading model...</div>
          )}
        </InfoBar>

        <Button onClick={toggleFullscreen}>
          {isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        </Button>
      </Container>
    </>
  );
}