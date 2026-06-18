import { toast, ToastContainer, ToastContainerProps } from "react-toastify";

type ToastType = "success" | "error" | "info" | "warning";

export const showToast = (message: string, type: ToastType) => {
  const toastId = message;
  if (!toast.isActive(toastId)) {
    toast[type](message, { toastId });
  }
};

export const BootstrapToastContainer = (props: ToastContainerProps) => (
  <ToastContainer
    position="bottom-center"
    autoClose={3000}
    hideProgressBar
    closeOnClick
    pauseOnHover={false}
    limit={1}
    {...props}
    toastClassName={(context) => {
      const type = context?.type;
      const typeClass =
        type === "success"
          ? "bg-success text-white"
          : type === "warning"
            ? "bg-warning text-dark"
            : type === "error"
              ? "bg-danger text-white"
              : "bg-info text-white";

      return `rounded-3 px-3 py-2 pe-4 position-relative ${typeClass}`;
    }}
    className="m-0 p-0"
    closeButton={({ closeToast }) => (
      <button
        onClick={closeToast}
        className="btn-close btn-close-white position-absolute top-0 end-0 m-2"
      />
    )}
    style={{
      bottom: "100px",
      fontSize: "1rem",
    }}
  />
);
