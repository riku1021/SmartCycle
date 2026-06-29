import { Badge, Box, Button, chakra, Flex } from "@chakra-ui/react";
import { useSearch } from "@tanstack/react-router";
import { type FC, useCallback, useEffect, useRef, useState } from "react";
import {
  fetchLatestGateDetection,
  type LatestDetectionResponse,
  sendGateCameraFrame,
  sendTripEvent,
} from "@/api/gateCamera";
import Layout from "@/layouts/layout";

const GateCamera: FC = () => {
  const { parkingLotId } = useSearch({ strict: false }) as { parkingLotId?: string };
  const POLLING_INTERVAL_MS = 500;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pollingIntervalRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prevBoxCentersRef = useRef<Map<number, number>>(new Map());
  const resetTimerRef = useRef<number | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [cameraError, setCameraError] = useState<string>("");
  const [videoAspectRatio, setVideoAspectRatio] = useState<number>(16 / 9);
  const [latestDetection, setLatestDetection] = useState<LatestDetectionResponse | null>(null);
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const [tripCount, setTripCount] = useState(0);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current !== null) {
      window.clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const stopCamera = useCallback(() => {
    stopPolling();
    const stream = streamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, [stopPolling]);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("このブラウザはWebカメラ機能に対応していません。");
      return;
    }
    try {
      setCameraError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          const videoWidth = videoRef.current?.videoWidth ?? 0;
          const videoHeight = videoRef.current?.videoHeight ?? 0;
          if (videoWidth > 0 && videoHeight > 0) {
            setVideoAspectRatio(videoWidth / videoHeight);
            setVideoDimensions({ width: videoWidth, height: videoHeight });
          }
        };
        await videoRef.current.play();
      }
      setIsStreaming(true);
    } catch {
      setCameraError("カメラを起動できませんでした。権限設定をご確認ください。");
      stopCamera();
    }
  }, [stopCamera]);

  useEffect(() => {
    void startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const captureFrameBlob = useCallback(async (): Promise<Blob | null> => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.85);
    });
  }, []);

  const sendCurrentFrame = useCallback(async () => {
    if (!parkingLotId) return;
    const frameBlob = await captureFrameBlob();
    if (!frameBlob) return;
    await sendGateCameraFrame(parkingLotId, frameBlob);
  }, [captureFrameBlob, parkingLotId]);

  const pollLatest = useCallback(async () => {
    if (!parkingLotId) return;
    const latest = await fetchLatestGateDetection(parkingLotId);

    const video = videoRef.current;
    if (video && latest.boxes.length > 0) {
      const lineX = video.videoWidth / 2;
      latest.boxes.forEach((box, i) => {
        const centerX = box.x + box.width / 2;
        const prevCenterX = prevBoxCentersRef.current.get(i);
        if (prevCenterX !== undefined) {
          if (prevCenterX > lineX && centerX <= lineX) {
            setTripCount((c) => c + 1);
            void sendTripEvent(parkingLotId, "in");
          }
          if (prevCenterX <= lineX && centerX > lineX) {
            setTripCount((c) => Math.max(0, c - 1));
            void sendTripEvent(parkingLotId, "out");
          }
        }
        prevBoxCentersRef.current.set(i, centerX);
      });
      if (latest.boxes.length < prevBoxCentersRef.current.size) {
        for (let i = latest.boxes.length; i < prevBoxCentersRef.current.size; i++) {
          prevBoxCentersRef.current.delete(i);
        }
      }
    }

    if (latest.boxes.length === 0) {
      if (resetTimerRef.current === null) {
        resetTimerRef.current = window.setTimeout(() => {
          prevBoxCentersRef.current.clear();
          resetTimerRef.current = null;
        }, 1000);
      }
    } else {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    }

    setLatestDetection(latest);
  }, [parkingLotId]);

  const runPollingCycle = useCallback(async () => {
    try {
      await sendCurrentFrame();
      await pollLatest();
      setCameraError("");
    } catch {
      stopPolling();
      setCameraError("ポーリング通信に失敗しました。接続状態をご確認ください。");
    }
  }, [pollLatest, sendCurrentFrame, stopPolling]);

  useEffect(() => {
    if (!isStreaming) {
      stopPolling();
      return;
    }
    if (pollingIntervalRef.current !== null) return;
    setIsPolling(true);
    void runPollingCycle();
    pollingIntervalRef.current = window.setInterval(() => {
      void runPollingCycle();
    }, POLLING_INTERVAL_MS);
    return () => {
      stopPolling();
    };
  }, [isStreaming, runPollingCycle, stopPolling]);

  const renderBoxes = () => {
    if (!latestDetection?.boxes.length) return null;
    const video = videoRef.current;
    if (!video) return null;
    const rect = video.getBoundingClientRect();
    const containerWidth = rect.width;
    const containerHeight = rect.height;
    const scaleX = containerWidth / (videoDimensions.width || video.videoWidth);
    const scaleY = containerHeight / (videoDimensions.height || video.videoHeight);
    const lineX = containerWidth / 2;

    return (
      <svg
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          transform: "scaleX(-1)",
          pointerEvents: "none",
        }}
        viewBox={`0 0 ${containerWidth} ${containerHeight}`}
      >
        <line
          x1={lineX}
          y1={0}
          x2={lineX}
          y2={containerHeight}
          stroke="#ef4444"
          strokeWidth={2}
          strokeDasharray="8,4"
        />

        {latestDetection.boxes.map((box, i) => (
          <g key={i}>
            <rect
              x={box.x * scaleX}
              y={box.y * scaleY}
              width={box.width * scaleX}
              height={box.height * scaleY}
              fill="none"
              stroke="#22c55e"
              strokeWidth={2}
            />
            <text
              x={box.x * scaleX + 4}
              y={box.y * scaleY - 4}
              fill="#22c55e"
              fontSize={12}
              transform={`scale(-1, 1) translate(${-(box.x * scaleX + 4) * 2 - box.width * scaleX}, 0)`}
            >
              {box.label} {Math.round(box.score * 100)}%
            </text>
          </g>
        ))}
      </svg>
    );
  };

  const renderTripwire = () => {
    if (!isStreaming) return null;
    return (
      <svg
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        <line
          x1="50%"
          y1="0"
          x2="50%"
          y2="100%"
          stroke="#ef4444"
          strokeWidth={2}
          strokeDasharray="8,4"
        />
      </svg>
    );
  };
  if (!parkingLotId) {
    return (
      <Layout subtitle="HTTP Polling" title="ゲートカメラ">
        <Box
          bg="var(--surface)"
          border="1px solid"
          borderColor="var(--border)"
          borderRadius="10px"
          color="#dc2626"
          fontSize="1rem"
          p={6}
        >
          Map画面から対象の駐輪場を選択して起動してください。
        </Box>
      </Layout>
    );
  }

  return (
    <Layout subtitle="HTTP Polling" title="ゲートカメラ">
      <Box
        bg="var(--surface)"
        border="1px solid"
        borderColor="var(--border)"
        borderRadius="16px"
        p={6}
      >
        <Box position="relative" mx="auto" maxW="805px" ref={containerRef}>
          <chakra.video
            aspectRatio={videoAspectRatio}
            autoPlay
            bg="#0f172a"
            borderRadius="12px"
            objectFit="cover"
            transform="scaleX(-1)"
            muted
            ref={videoRef}
            w="100%"
            display="block"
          />
          {renderTripwire()}
          {renderBoxes()}
        </Box>

        <Flex
          alignItems="center"
          bg="var(--bg)"
          border="1px solid"
          borderColor="var(--border)"
          borderRadius="12px"
          gap={2}
          mt={4}
          p={2}
          wrap={{ base: "wrap", lg: "nowrap" }}
        >
          <Button disabled={isStreaming} onClick={() => void startCamera()}>
            カメラ起動
          </Button>
          <Button onClick={stopCamera} variant="outline">
            カメラ停止
          </Button>
          <Badge
            bg={isStreaming ? "#dcfce7" : "#e2e8f0"}
            borderRadius="full"
            color={isStreaming ? "#166534" : "#475569"}
            px={3}
            py={1.5}
          >
            状態: {isStreaming ? "配信中" : "停止中"}
          </Badge>
          <Badge
            bg={isPolling ? "#dbeafe" : "#e2e8f0"}
            borderRadius="full"
            color={isPolling ? "#1d4ed8" : "#475569"}
            px={3}
            py={1.5}
          >
            通信: {isPolling ? `実行中（${POLLING_INTERVAL_MS / 1000}秒間隔）` : "停止中"}
          </Badge>
          <Badge bg="#ede9fe" borderRadius="full" color="#5b21b6" px={3} py={1.5}>
            最新検出数: {latestDetection?.detected_count ?? 0}
          </Badge>
          <Badge bg="#fef9c3" borderRadius="full" color="#854d0e" px={3} py={1.5}>
            通過台数: {tripCount}
          </Badge>
        </Flex>

        {cameraError ? (
          <Box bg="#fef2f2" borderRadius="10px" color="#dc2626" fontSize="0.86rem" mt={3} p={3}>
            {cameraError}
          </Box>
        ) : null}
        <Box as="canvas" display="none" ref={canvasRef} />
      </Box>
    </Layout>
  );
};

export default GateCamera;
