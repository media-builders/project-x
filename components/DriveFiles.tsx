"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
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

  const supabase = createClient();

  const fetchDriveFiles = async (folderId: string = "root") => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData?.session) throw new Error("No Supabase session found");

    const accessToken = sessionData.session.provider_token;
    if (!accessToken) throw new Error("Google access token missing. Try logging in again.");

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&fields=files(id,name,mimeType,webViewLink)`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) throw new Error(`Google Drive API error: ${await response.text()}`);

    const data = await response.json();
    return data.files || [];
  };

  useEffect(() => {
    fetchDriveFiles()
      .then((f) => setFiles(f))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session) throw new Error("No Supabase session found");

      const accessToken = sessionData.session.provider_token;
      if (!accessToken) throw new Error("Google access token missing. Try logging in again.");

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

      const uploadResponse = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData,
        }
      );

      if (!uploadResponse.ok) throw new Error("Upload failed");

      await fetchDriveFiles(currentFolder).then((f) => setFiles(f));
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

  if (loading) return <p>Loading Google Drive files...</p>;
  if (error) return <p className="error">Error: {error}</p>;

  return (
    <div className="drive-container">
      {/* Header */}
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
