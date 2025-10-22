"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

export default function LeadCaptureFormSetup() {
  const [userId, setUserId] = useState<string | null>(null);
  const [includeFields, setIncludeFields] = useState({
    fname: true,
    lname: true,
    email: true,
    phone: true,
  });

  const [styles, setStyles] = useState({
    titleText: "Lead Capture",
    formBgType: "solid",
    formBg: "#404040",
    formGradientFrom: "#111827",
    formGradientTo: "#1e3a8a",
    formText: "#ffffff",
    formFontSize: 16,
    inputBg: "rgba(255,255,255,0.05)",
    inputText: "#ffffff",
    inputFontSize: 15,
    buttonBgType: "solid",
    buttonBg: "#46aaff",
    buttonGradientFrom: "#46aaff",
    buttonGradientTo: "#00e0ff",
    buttonText: "#06101f",
    buttonFontSize: 16,
    borderRadius: 6,
    formShadow: true,
  });

  const [copied, setCopied] = useState(false);

  // === FETCH APP USER ID FROM SUPABASE ===
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr) {
          console.error("auth.getUser error:", authErr);
          return;
        }
        const authUser = authData?.user;
        if (!authUser) {
          console.warn("⚠️ No auth user; cannot resolve users_table id.");
          return;
        }

        const email = authUser.email;
        if (email) {
          const { data: appUser, error: lookupErr } = await supabase
            .from("users_table")
            .select("id, email")
            .eq("email", email)
            .maybeSingle();

          if (lookupErr) console.error("users_table lookup error:", lookupErr);

          if (appUser?.id) {
            setUserId(appUser.id);
            return;
          }
        }

        console.warn("No users_table match; falling back to auth UID.");
        setUserId(authUser.id);
      } catch (err) {
        console.error("Supabase user resolution error:", err);
      }
    })();
  }, []);

  const handleStyleChange = (
    key: keyof typeof styles,
    value: string | number | boolean
  ) => setStyles((prev) => ({ ...prev, [key]: value }));

  const handleToggle = (field: keyof typeof includeFields) =>
    setIncludeFields((prev) => ({ ...prev, [field]: !prev[field] }));

  const fields = Object.entries(includeFields)
    .filter(([_, v]) => v)
    .map(([key]) => key);

  // === MEMOIZED renderFormHTML FUNCTION ===
  const renderFormHTML = useCallback(
    (inlineOnly = false): string | JSX.Element => {
      const labels: Record<string, string> = {
        fname: "First Name",
        lname: "Last Name",
        email: "Email Address",
        phone: "Phone Number",
      };

      const formBackground =
        styles.formBgType === "gradient"
          ? `linear-gradient(135deg, ${styles.formGradientFrom}, ${styles.formGradientTo})`
          : styles.formBg;

      const buttonBackground =
        styles.buttonBgType === "gradient"
          ? `linear-gradient(135deg, ${styles.buttonGradientFrom}, ${styles.buttonGradientTo})`
          : styles.buttonBg;

      const inputHTML = fields
        .map(
          (f) => `
        <div style="display:flex;flex-direction:column;width:100%;gap:6px;">
          <label style="color:${styles.inputText};font-size:${styles.inputFontSize}px;">
            ${labels[f]}
          </label>
          <input type="${
            f === "email" ? "email" : f === "phone" ? "tel" : "text"
          }" name="${f}" placeholder="Enter your ${labels[f].toLowerCase()}" required
          style="width:100%;padding:10px 12px;border-radius:${styles.borderRadius}px;
          color:${styles.inputText};font-size:${styles.inputFontSize}px;
          border:1px solid rgba(255,255,255,0.15);
          background:${styles.inputBg};
          box-sizing:border-box;" />
        </div>`
        )
        .join("\n");

      const fullForm = `
<div style="display:flex;justify-content:center;align-items:center;padding:20px;box-sizing:border-box;">
  <form onsubmit="submitLead(event)" 
    style="background:${formBackground};color:${styles.formText};
    border-radius:${styles.borderRadius}px;width:560px;max-width:560px;
    margin:auto;padding:40px;${styles.formShadow ? "box-shadow:0 4px 20px rgba(0,0,0,0.5);" : "box-shadow:none;"}
    font-family:Inter,sans-serif;display:flex;flex-direction:column;gap:20px;">
    <h2 style="font-weight:600;margin:0;color:${styles.formText};
      font-size:${styles.formFontSize}px;line-height:1.2;text-align:left;">
      ${styles.titleText}
    </h2>
    <input type="hidden" name="user_id" value="${userId || "MISSING_USER_ID"}" />
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px 24px;width:100%;">
      ${inputHTML}
    </div>
    <button type="submit"
      style="margin-top:12px;width:100%;padding:12px;border:none;
      border-radius:${styles.borderRadius}px;background:${buttonBackground};
      color:${styles.buttonText};font-weight:600;cursor:pointer;
      font-size:${styles.buttonFontSize}px;">Submit</button>
  </form>
</div>

<script>
async function submitLead(e){
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));
  try {
    const res = await fetch("https://${window.location.host}/api/leads/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if(res.ok){
      alert("✅ Thank you! Your info has been received.");
      form.reset();
    } else {
      const text = await res.text();
      alert("❌ Error: " + text);
    }
  } catch(err){
    alert("⚠️ Network error. Please try again.");
  }
}
</script>`.trim();

      return inlineOnly
        ? fullForm
        : <div dangerouslySetInnerHTML={{ __html: fullForm }} />;
    },
    [fields, styles, userId] // dependencies
  );

  // === MEMOIZED HTML + PREVIEW ===
  const generatedHTML: string = useMemo(
    () => renderFormHTML(true) as string,
    [renderFormHTML]
  );

  const livePreview = useMemo(
    () => renderFormHTML(false),
    [renderFormHTML]
  );

  // === COPY FUNCTION ===
  const copyToClipboard = async () => {
    if (!userId) return;
    await navigator.clipboard.writeText(generatedHTML);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="">
      <div className="pb-4 border-b border-gray-800 mb-5">
        <h2 className="text-xl font-semibold text-white/90">Form Builder</h2>
        <p className="text-sm text-gray-400">
          Customize your lead form with live preview and export options.
        </p>
      </div>

      {/* === Title === */}
      <div className="builder-panel">
        <h3>Title</h3>
        <input
          type="text"
          value={styles.titleText}
          onChange={(e) => handleStyleChange("titleText", e.target.value)}
          className="builder-input"
        />
      </div>

      {/* === Fields === */}
      <div className="builder-panel">
        <h3>Form Fields</h3>
        <div className="builder-section">
          {Object.entries(includeFields).map(([key, value]) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <input
                type="checkbox"
                checked={value}
                onChange={() => handleToggle(key as keyof typeof includeFields)}
                className="builder-checkbox"
              />
              <span style={{ textTransform: "capitalize", fontSize: "13px" }}>{key}</span>
            </label>
          ))}
        </div>

        {/* Border Radius */}
        <div style={{ marginTop: "12px" }}>
          <label style={{ fontSize: "12px" }}>Border Radius ({styles.borderRadius}px)</label>
          <input
            type="range"
            min={0}
            max={30}
            value={styles.borderRadius}
            onChange={(e) => handleStyleChange("borderRadius", Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Shadow Toggle */}
        <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
          <input
            type="checkbox"
            checked={styles.formShadow}
            onChange={(e) => handleStyleChange("formShadow", e.target.checked)}
            className="builder-checkbox"
          />
          <label style={{ fontSize: "13px" }}>Enable Form Shadow</label>
        </div>
      </div>

      {/* === Preview === */}
      <div className="builder-panel builder-preview">
        <h3>Live Preview</h3>
        {livePreview}
      </div>

      {/* === Embed === */}
      <div className="builder-panel">
        <h3>Embed Code</h3>
        <textarea readOnly value={generatedHTML} className="builder-textarea" rows={8} />
        <button
          onClick={copyToClipboard}
          className="builder-button w-full"
          disabled={!userId}
          title={!userId ? "Login required to copy embed" : ""}
          style={{
            opacity: userId ? 1 : 0.5,
            cursor: userId ? "pointer" : "not-allowed",
          }}
        >
          {userId ? (copied ? "Copied!" : "Copy Embed Code") : "Login to Copy Embed"}
        </button>
      </div>
    </div>
  );
}
