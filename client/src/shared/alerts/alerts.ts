import Swal, { type SweetAlertIcon, type SweetAlertResult } from "sweetalert2";

const commonOptions = {
  didOpen: () => {
    const container = Swal.getContainer();
    if (container) {
      container.style.zIndex = "3000";
    }
    const popup = Swal.getPopup();
    if (popup) {
      popup.style.borderRadius = "25px";
      popup.style.padding = "10px";
    }
    const confirmButton = Swal.getConfirmButton();
    if (confirmButton) {
      confirmButton.style.borderRadius = "50px";
      confirmButton.style.padding = "10px 20px";
    }
    const cancelButton = Swal.getCancelButton();
    if (cancelButton) {
      cancelButton.style.borderRadius = "50px";
      cancelButton.style.padding = "10px 20px";
    }
  },
  showCloseButton: true,
};

// 成功アラート
export const showSuccessAlert = (title: string, text: string): Promise<SweetAlertResult> => {
  return Swal.fire({
    icon: "success" as SweetAlertIcon,
    title,
    text,
    timer: 2000,
    showConfirmButton: false,
    timerProgressBar: true,
    ...commonOptions,
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
    ...commonOptions,
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
    ...commonOptions,
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
    ...commonOptions,
  });
};
