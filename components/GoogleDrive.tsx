"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Folder, FileText, ArrowLeft, Upload } from "lucide-react";

export default function DriveFiles() {
  const [files, setFiles] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: "root", name: "My Drive" }]);
  const [currentFolder, setCurrentFolder] = useState("root");
  const [clickedFolder, setClickedFolder] = useState<string | null>(null);
  const [direction, setDirection] = useState(0);
  const [nextFiles, setNextFiles] = useState<any[] | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tokenInitialized, setTokenInitialized] = useState(false);
  const refreshingTokenRef = useRef<Promise<string | null> | null>(null);

  const refreshGoogleAccessToken = useCallback(async (): Promise<string | null> => {
    if (refreshingTokenRef.current) {
      return refreshingTokenRef.current;
    }

    const refreshPromise = (async () => {
      try {
        const res = await fetch("/api/google/token", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || `Google token refresh failed (${res.status})`);
        }

        const newToken = typeof data?.accessToken === "string" ? data.accessToken : null;
        setAccessToken(newToken);
        return newToken;
      } catch (err) {
        console.error("Google token refresh error:", err);
        setAccessToken(null);
        return null;
      } finally {
        refreshingTokenRef.current = null;
        setTokenInitialized(true);
      }
    })();

    refreshingTokenRef.current = refreshPromise;
    return refreshPromise;
  }, []);

  useEffect(() => {
    void refreshGoogleAccessToken();
  }, [refreshGoogleAccessToken]);

  const fetchDriveFiles = useCallback(
    async (folderId: string = "root") => {
      let token = accessToken ?? (await refreshGoogleAccessToken());
      if (!token) throw new Error("Google access token missing. Try logging in again.");

      const request = async (authToken: string) =>
        fetch(
          `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&fields=files(id,name,mimeType,webViewLink)`,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );

      let response = await request(token);
      if (response.status === 401) {
        const refreshed = await refreshGoogleAccessToken();
        if (refreshed && refreshed !== token) {
          token = refreshed;
          response = await request(refreshed);
        }
      }

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text ? `Google Drive API error: ${text}` : "Failed to load Drive files.");
      }

      const data = await response.json();
      return data.files || [];
    },
    [accessToken, refreshGoogleAccessToken]
  );

  useEffect(() => {
    if (!tokenInitialized) return;

    setLoading(true);
    setError(null);

    fetchDriveFiles()
      .then((f) => setFiles(f))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tokenInitialized, fetchDriveFiles]);

  const handleOpenFolder = async (file: any) => {
    if (isTransitioning) return;
    setClickedFolder(file.id);
    setDirection(1);
    setIsTransitioning(true);

    try {
      const preloaded = await fetchDriveFiles(file.id);
      setNextFiles(preloaded);

      setTimeout(() => {
        setFiles(preloaded);
        setBreadcrumbs((prev) => [...prev, { id: file.id, name: file.name }]);
        setCurrentFolder(file.id);
        setClickedFolder(null);
        setNextFiles(null);
        setIsTransitioning(false);
      }, 350);
    } catch (err: any) {
      setError(err.message);
      setIsTransitioning(false);
    }
  };

  const handleBreadcrumbClick = async (crumb: any, index: number) => {
    if (isTransitioning) return;
    setDirection(-1);
    setIsTransitioning(true);

    try {
      const preloaded = await fetchDriveFiles(crumb.id);
      setNextFiles(preloaded);

      setTimeout(() => {
        setFiles(preloaded);
        setBreadcrumbs((prev) => prev.slice(0, index + 1));
        setCurrentFolder(crumb.id);
        setNextFiles(null);
        setIsTransitioning(false);
      }, 350);
    } catch (err: any) {
      setError(err.message);
      setIsTransitioning(false);
    }
  };

  // Upload logic
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      let token = accessToken ?? (await refreshGoogleAccessToken());
      if (!token) throw new Error("Google access token missing. Try logging in again.");

      const metadata = {
        name: file.name,
        parents: currentFolder === "root" ? [] : [currentFolder],
      };

      const formData = new FormData();
      formData.append(
        "metadata",
        new Blob([JSON.stringify(metadata)], { type: "application/json" })
      );
      formData.append("file", file);

      const sendUpload = (authToken: string) =>
        fetch(
          "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${authToken}` },
            body: formData,
          }
        );

      let uploadResponse = await sendUpload(token);
      if (uploadResponse.status === 401) {
        const refreshed = await refreshGoogleAccessToken();
        if (refreshed && refreshed !== token) {
          token = refreshed;
          uploadResponse = await sendUpload(refreshed);
        }
      }

      if (!uploadResponse.ok) {
        const text = await uploadResponse.text().catch(() => "");
        throw new Error(text || "Upload failed");
      }

      const updated = await fetchDriveFiles(currentFolder);
      setFiles(updated);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
      position: "absolute" as const,
    }),
    center: { x: 0, opacity: 1, position: "relative" as const },
    exit: (direction: number) => ({
      x: direction > 0 ? -50 : 50,
      opacity: 0,
      position: "absolute" as const,
    }),
  };

  if (loading) return <p>Loading files...</p>;
  if (error) return <p className="error">Error: {error}</p>;

  return (
    <div className="drive-container">
      {/* Header */}
      <div className="pb-4 border-b border-gray-800 mb-5">
        <h2 className="text-xl font-semibold text-white/90">Files</h2>
        <p className="text-sm text-gray-400">
          Manage your files.
        </p>
      </div>
      <div className="drive-header">
        <div className="drive-breadcrumbs">
          {breadcrumbs.map((crumb, i) => (
            <span
              key={crumb.id}
              className={`drive-crumb ${i === breadcrumbs.length - 1 ? "active" : ""}`}
              onClick={() => i !== breadcrumbs.length - 1 && handleBreadcrumbClick(crumb, i)}
            >
              {i !== 0 && "→"} {crumb.name}
            </span>
          ))}
        </div>

        <div className="drive-actions">
          <button
            className="upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload size={16} />
            {isUploading ? "Uploading..." : "Upload"}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* Back button */}
      {breadcrumbs.length > 1 && (
        <button
          className="drive-back-btn"
          onClick={() =>
            handleBreadcrumbClick(breadcrumbs[breadcrumbs.length - 2], breadcrumbs.length - 2)
          }
        >
          <ArrowLeft size={18} /> Back
        </button>
      )}

      {/* File Grid */}
      <div className="drive-grid-wrapper">
        <AnimatePresence custom={direction} initial={false} mode="popLayout">
          <motion.div
            key={currentFolder}
            className="drive-grid"
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: "easeInOut" }}
          >
            {files.length === 0 ? (
              <p className="drive-empty">No files found.</p>
            ) : (
              files.map((file) => {
                const isFolder = file.mimeType === "application/vnd.google-apps.folder";
                const isLoading = clickedFolder === file.id;

                return (
                  <motion.div
                    key={file.id}
                    className={`drive-item ${isLoading ? "loading" : ""}`}
                    onClick={() =>
                      isFolder
                        ? handleOpenFolder(file)
                        : window.open(file.webViewLink, "_blank")
                    }
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="drive-icon">
                      {isFolder ? (
                        <Folder className="icon folder" />
                      ) : (
                        <FileText className="icon file" />
                      )}
                    </div>
                    <p className="drive-name">{file.name}</p>

                    {isLoading && (
                      <motion.div
                        className="drive-item-shimmer"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.8 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="drive-shimmer"></div>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
