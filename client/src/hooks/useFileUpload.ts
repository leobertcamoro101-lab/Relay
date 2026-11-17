import { useCallback, useContext } from "react";
import { useHttpClient } from "./useHttpClient";
import { AuthContext } from "../context/auth-context";
import type { MessageAttachment } from "../types";

// Uploads a file via POST ${VITE_BACKEND_URL}/upload (multipart, Bearer auth),
// which stores it in Cloudinary and responds with { url }. name/type/size
// fall back to the File's own metadata when the response doesn't echo them.
export const useFileUpload = () => {
  const { token } = useContext(AuthContext);
  const { sendRequest, isLoading, error } = useHttpClient();

  const uploadFile = useCallback(
    async (file: File): Promise<MessageAttachment> => {
      const formData = new FormData();
      formData.append("file", file);

      const responseData = await sendRequest(
        `${import.meta.env.VITE_BACKEND_URL}/upload`,
        "POST",
        formData,
        // Deliberately no Content-Type header here — when the body is a
        // FormData instance, the browser sets
        // "multipart/form-data; boundary=..." itself, with the correct
        // boundary. Setting it manually would break the upload.
        { Authorization: `Bearer ${token}` }
      );

      // Fallbacks cover a response that only echoes back { url } — we still
      // have the real file's metadata on hand to fill in the rest.
      return {
        url: responseData.url,
        name: responseData.name ?? file.name,
        type: responseData.type ?? file.type,
        size: responseData.size ?? file.size,
      };
    },
    [sendRequest, token]
  );

  return { uploadFile, isUploading: isLoading, uploadError: error };
};
