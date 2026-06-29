import { Box, Button, Heading, Input, SimpleGrid, Text } from "@chakra-ui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { CSSProperties, FC, FormEvent } from "react";
import { useState } from "react";
import { FaArrowLeft, FaFloppyDisk } from "react-icons/fa6";
import { type CreateParkingLotParams, createParkingLot } from "@/api/parking-lots";
import Layout from "@/layouts/layout";

type FormState = {
  name: string;
  latitude: string;
  longitude: string;
  totalSpots: string;
  pricePerHour: string;
  availabilitySourceType: CreateParkingLotParams["availability_source_type"];
};

const initialForm: FormState = {
  name: "",
  latitude: "",
  longitude: "",
  totalSpots: "",
  pricePerHour: "",
  availabilitySourceType: "touch_sensor",
};

const fieldLabelStyle: CSSProperties = {
  display: "block",
  color: "#334155",
  fontSize: "0.9rem",
  fontWeight: 700,
  marginBottom: "8px",
};

const selectStyle: CSSProperties = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: "8px",
  minHeight: "40px",
  padding: "0 12px",
  fontSize: "0.95rem",
  background: "#ffffff",
  color: "#0f172a",
};

function parseNumber(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildPayload(form: FormState): CreateParkingLotParams | string {
  const name = form.name.trim();
  const latitude = parseNumber(form.latitude);
  const longitude = parseNumber(form.longitude);
  const totalSpots = Number.parseInt(form.totalSpots, 10);
  const pricePerHour = Number.parseInt(form.pricePerHour, 10);

  if (!name) {
    return "駐輪場名を入力してください。";
  }
  if (latitude === null || latitude < -90 || latitude > 90) {
    return "緯度は -90 から 90 の範囲で入力してください。";
  }
  if (longitude === null || longitude < -180 || longitude > 180) {
    return "経度は -180 から 180 の範囲で入力してください。";
  }
  if (!Number.isInteger(totalSpots) || totalSpots < 1) {
    return "収容台数は 1 以上の整数で入力してください。";
  }
  if (!Number.isInteger(pricePerHour) || pricePerHour < 1) {
    return "時間単価は 1 以上の整数で入力してください。";
  }

  return {
    name,
    latitude,
    longitude,
    total_spots: totalSpots,
    price_per_hour: pricePerHour,
    availability_source_type: form.availabilitySourceType,
  };
}

const LotRegisterComponent: FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(initialForm);
  const [formError, setFormError] = useState("");

  const mutation = useMutation({
    mutationFn: createParkingLot,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
      await queryClient.invalidateQueries({ queryKey: ["parkingLots"] });
      await navigate({ to: "/dashboard" });
    },
    onError: () => {
      setFormError("駐輪場の登録に失敗しました。入力内容を確認してください。");
    },
  });

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    const payload = buildPayload(form);
    if (typeof payload === "string") {
      setFormError(payload);
      return;
    }
    mutation.mutate(payload);
  };

  return (
    <Layout title="駐輪場登録" subtitle="管理する駐輪場の基本情報を登録します">
      <Box
        bg="white"
        border="1px solid"
        borderColor="#e2e8f0"
        borderRadius="12px"
        boxShadow="0 4px 6px -1px rgba(0,0,0,0.05)"
        maxW="920px"
        p={{ base: 5, md: 6 }}
      >
        <form onSubmit={handleSubmit}>
          <Box borderBottom="1px solid #e2e8f0" mb={6} pb={4}>
            <Heading as="h2" fontSize="1.15rem" mb={2}>
              基本情報
            </Heading>
            <Text color="#64748b" fontSize="0.9rem">
              登録後、空き台数は収容台数と同じ値で初期化されます。
            </Text>
          </Box>

          {formError ? (
            <Box
              bg="#fef2f2"
              border="1px solid #fecaca"
              borderRadius="8px"
              color="#b91c1c"
              mb={5}
              p={3}
            >
              {formError}
            </Box>
          ) : null}

          <SimpleGrid columns={{ base: 1, md: 2 }} gap={5}>
            <Box gridColumn={{ base: "auto", md: "span 2" }}>
              <label htmlFor="lot-name" style={fieldLabelStyle}>
                駐輪場名
              </label>
              <Input
                id="lot-name"
                maxLength={255}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="梅田サイクルステーション"
                value={form.name}
              />
            </Box>

            <Box>
              <label htmlFor="lot-latitude" style={fieldLabelStyle}>
                緯度
              </label>
              <Input
                id="lot-latitude"
                inputMode="decimal"
                onChange={(event) => updateField("latitude", event.target.value)}
                placeholder="34.70248"
                type="number"
                value={form.latitude}
              />
            </Box>

            <Box>
              <label htmlFor="lot-longitude" style={fieldLabelStyle}>
                経度
              </label>
              <Input
                id="lot-longitude"
                inputMode="decimal"
                onChange={(event) => updateField("longitude", event.target.value)}
                placeholder="135.49595"
                type="number"
                value={form.longitude}
              />
            </Box>

            <Box>
              <label htmlFor="lot-total-spots" style={fieldLabelStyle}>
                収容台数
              </label>
              <Input
                id="lot-total-spots"
                min={1}
                onChange={(event) => updateField("totalSpots", event.target.value)}
                placeholder="30"
                type="number"
                value={form.totalSpots}
              />
            </Box>

            <Box>
              <label htmlFor="lot-price-per-hour" style={fieldLabelStyle}>
                時間単価
              </label>
              <Input
                id="lot-price-per-hour"
                min={1}
                onChange={(event) => updateField("pricePerHour", event.target.value)}
                placeholder="100"
                type="number"
                value={form.pricePerHour}
              />
            </Box>

            <Box gridColumn={{ base: "auto", md: "span 2" }}>
              <label htmlFor="lot-availability-source-type" style={fieldLabelStyle}>
                空き情報ソース種別
              </label>
              <select
                id="lot-availability-source-type"
                onChange={(event) =>
                  updateField(
                    "availabilitySourceType",
                    event.target.value as FormState["availabilitySourceType"]
                  )
                }
                style={selectStyle}
                value={form.availabilitySourceType}
              >
                <option value="touch_sensor">タッチセンサー</option>
                <option value="gate_camera">ゲートカメラ</option>
                <option value="overhead_camera">俯瞰カメラ</option>
              </select>
            </Box>
          </SimpleGrid>

          <Box display="flex" flexWrap="wrap" gap={3} justifyContent="flex-end" mt={7}>
            <Button
              bg="#f1f5f9"
              color="#475569"
              onClick={() => void navigate({ to: "/dashboard" })}
              type="button"
              _hover={{ bg: "#e2e8f0" }}
            >
              <FaArrowLeft />
              キャンセル
            </Button>
            <Button
              bg="#4f46e5"
              color="white"
              disabled={mutation.isPending}
              type="submit"
              _hover={{ bg: "#4338ca" }}
            >
              <FaFloppyDisk />
              {mutation.isPending ? "登録中..." : "登録する"}
            </Button>
          </Box>
        </form>
      </Box>
    </Layout>
  );
};

export default LotRegisterComponent;
