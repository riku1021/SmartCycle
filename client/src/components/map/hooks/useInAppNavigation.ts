import { useCallback, useEffect, useMemo, useState } from "react";
import { haversineMeters, stripHtml } from "../types/route";

const STEP_THRESHOLD_METERS = 25;

type UseInAppNavigationParams = {
  route: google.maps.DirectionsRoute | null;
  currentLatLng: [number, number];
  isNavigating: boolean;
};

export const useInAppNavigation = ({
  route,
  currentLatLng,
  isNavigating,
}: UseInAppNavigationParams) => {
  const [stepIndex, setStepIndex] = useState(0);

  const steps = useMemo(() => route?.legs[0]?.steps ?? [], [route]);

  useEffect(() => {
    if (!isNavigating) {
      setStepIndex(0);
      return;
    }
    if (steps.length === 0) return;

    const step = steps[stepIndex];
    if (!step?.end_location) return;

    const endLat = step.end_location.lat();
    const endLng = step.end_location.lng();
    const dist = haversineMeters(
      { lat: currentLatLng[0], lng: currentLatLng[1] },
      { lat: endLat, lng: endLng }
    );

    if (dist <= STEP_THRESHOLD_METERS && stepIndex < steps.length - 1) {
      setStepIndex((prev) => prev + 1);
    }
  }, [currentLatLng, isNavigating, stepIndex, steps]);

  const currentStep = steps[stepIndex] ?? null;
  const nextInstruction = currentStep ? stripHtml(currentStep.instructions) : "";
  const remainingDistance = useMemo(() => {
    let meters = 0;
    for (let i = stepIndex; i < steps.length; i++) {
      meters += steps[i]?.distance?.value ?? 0;
    }
    return meters;
  }, [stepIndex, steps]);

  const remainingDurationSec = useMemo(() => {
    let sec = 0;
    for (let i = stepIndex; i < steps.length; i++) {
      sec += steps[i]?.duration?.value ?? 0;
    }
    return sec;
  }, [stepIndex, steps]);

  const isComplete = isNavigating && steps.length > 0 && stepIndex >= steps.length - 1;

  const resetNavigation = useCallback(() => {
    setStepIndex(0);
  }, []);

  return {
    stepIndex,
    steps,
    currentStep,
    nextInstruction,
    remainingDistance,
    remainingDurationSec,
    isComplete,
    resetNavigation,
  };
};
