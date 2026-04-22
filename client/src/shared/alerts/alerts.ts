import Swal, { type SweetAlertIcon, type SweetAlertResult } from "sweetalert2";
import "./alerts.css";

// 成功アラート
export const showSuccessAlert = (title: string, text: string): Promise<SweetAlertResult> => {
  return Swal.fire({
    icon: "success" as SweetAlertIcon,
    title,
    text,
    timer: 2000,
    showConfirmButton: false,
    timerProgressBar: true,
    showCloseButton: true,
    customClass: {
      popup: "swal2-popup",
    },
  });
};

// エラーアラート
export const showErrorAlert = (title: string, text: string): Promise<SweetAlertResult> => {
  return Swal.fire({
    icon: "error" as SweetAlertIcon,
    title,
    text,
    timer: 3000,
    showConfirmButton: false,
    timerProgressBar: true,
    showCloseButton: true,
    customClass: {
      popup: "swal2-popup",
    },
  });
};

// 情報アラート
export const showInfoAlert = (
  title: string,
  text: string,
  inputType: "password" | "text" | "none" = "password"
): Promise<SweetAlertResult> => {
  const inputConfig =
    inputType === "none"
      ? {}
      : {
          input: inputType,
          inputAttributes: {
            autocapitalize: "off",
          },
        };
  return Swal.fire({
    icon: "info" as SweetAlertIcon,
    title,
    html: text,
    ...inputConfig,
    showCancelButton: true,
    confirmButtonColor: "#1976d2",
    confirmButtonText: "はい",
    cancelButtonText: "キャンセル",
    showCloseButton: true,
    customClass: {
      popup: "swal2-popup",
      confirmButton: "swal2-confirm",
      cancelButton: "swal2-cancel",
    },
  });
};

// 確認アラート
export const showConfirmationAlert = (
  title: string,
  text: string,
  confirmButtonText: string,
  cancelButtonText: string
): Promise<SweetAlertResult> => {
  return Swal.fire({
    icon: "warning" as SweetAlertIcon,
    title,
    text,
    confirmButtonColor: "#1976d2",
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    showCloseButton: true,
    customClass: {
      popup: "swal2-popup",
      confirmButton: "swal2-confirm",
      cancelButton: "swal2-cancel",
    },
  });
};
