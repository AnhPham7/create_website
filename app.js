(() => {
  const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbyuEUQU5isxDGFiqBJkYaVXHcdonAXNirX3ORxTEFnNAEEvb8N3xVmUoRqZFiIxguJawA/exec";
  const isConfigured =
    /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(SCRIPT_URL);
  const form = document.getElementById("attendance-form");
  const nameInput = document.getElementById("student-name");
  const classInput = document.getElementById("student-class");
  const status = document.getElementById("app-status");
  const lesson = document.getElementById("lesson-area");
  const attendanceCard = document.getElementById("attendance-card");
  const answerFields = [...document.querySelectorAll("[data-answer]")];
  const websiteCode = document.getElementById("website-code");
  const codeHighlight = document.getElementById("code-highlight");
  const websitePreview = document.getElementById("website-preview");
  const lineNumbers = document.getElementById("code-line-numbers");
  const codeCharacterCount = document.getElementById("code-character-count");
  const codeEditorStatus = document.getElementById("code-editor-status");
  const runCodeButton = document.getElementById("run-code");
  const copyCodeButton = document.getElementById("copy-code");
  const saveLabel = document.getElementById("save-label");
  const saveIndicator = document.getElementById("save-indicator");
  const finishButton = document.getElementById("finish-lesson");
  const SESSION_STORAGE_KEY = "ha-thanh-bai23-progress-v1";
  const pendingRequests = new Map();
  const revealTargets = [
    ...document.querySelectorAll(
      ".hero, .attendance-card, .activity-card, .subactivity, .question-card, .example-card",
    ),
  ];
  let revealObserver = null;
  if ("IntersectionObserver" in window) {
    document.documentElement.classList.add("reveal-ready");
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.12 },
    );
    revealTargets.forEach((target) => {
      target.classList.add("reveal");
      revealObserver.observe(target);
    });
  }
  const codeTokenPattern =
    /(&lt;!--[\s\S]*?--&gt;|&lt;!doctype\b[^&]*(?:&gt;|$)|&lt;\/?[a-z][\w-]*|&gt;|&quot;.*?&quot;|'[^'\n]*'|\b(?:const|let|var|function|return|if|else|new|document|true|false)\b|\b\d+(?:\.\d+)?\b)/gi;
  const STARTER_WEBSITE_CODE = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Trường THPT Hà Thành</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; color: #233047; background: #f5f7fc; }
    header { padding: 18px 8%; display: flex; justify-content: space-between; background: white; }
    header a { color: #5446c8; font-weight: bold; text-decoration: none; }
    .hero { padding: 48px 8%; color: white; background: linear-gradient(120deg, #5547cc, #8978ed); }
    h1 { margin: 0 0 12px; font-size: 34px; }
    main { padding: 28px 8%; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 14px; }
    article { padding: 20px; border-radius: 14px; background: white; box-shadow: 0 6px 20px #33415512; }
    article span { font-size: 26px; }
    button { padding: 11px 16px; border: 0; border-radius: 9px; color: white; background: #ef9253; cursor: pointer; }
    footer { padding: 20px 8%; color: #64748b; background: white; }
  </style>
</head>
<body>
  <header><a href="#">THPT HÀ THÀNH</a><a href="#hoat-dong">Hoạt động trường</a></header>
  <section class="hero">
    <h1>Chào mừng đến với Hà Thành!</h1>
    <p>Nơi chắp cánh những ước mơ và ý tưởng sáng tạo.</p>
  </section>
  <main id="hoat-dong">
    <h2>Khám phá trường mình</h2>
    <div class="cards">
      <article><span>📚</span><h3>Góc học tập</h3><p>Tài liệu và kiến thức dành cho học sinh.</p></article>
      <article><span>🎨</span><h3>Hoạt động</h3><p>Cùng nhìn lại những khoảnh khắc đáng nhớ.</p></article>
      <article><span>📅</span><h3>Lịch học</h3><p>Cập nhật lịch học và thông báo của trường.</p></article>
    </div>
    <p id="notice">Thử bấm nút sau khi sửa mã JavaScript nhé!</p>
    <button id="hello-button">Gửi lời chào</button>
  </main>
  <footer>Trường THPT Hà Thành · Học tập, kết nối, sáng tạo</footer>
  <script>
    document.getElementById("hello-button").addEventListener("click", () => {
      document.getElementById("notice").textContent = "Chúc em có một ngày học tập thật vui!";
    });
  <\/script>
</body>
</html>`;
  let activeSession = null;
  let studentInfo = null;
  let isSubmitted = false;
  let responseFrame = null;
  let previewTimer;

  const isTouchLayout = () =>
    window.matchMedia("(max-width: 760px), (pointer: coarse)").matches;

  const setStatus = (message, isError = true) => {
    status.textContent = message;
    status.classList.toggle("status-success", !isError);
  };

  const persistProgress = () => {
    if (!studentInfo || (!activeSession && !isSubmitted)) return false;

    const progress = {
      version: 1,
      student: studentInfo,
      session: activeSession,
      submitted: isSubmitted,
      answers: Object.fromEntries(
        answerFields.map((field) => [field.dataset.answer, field.value]),
      ),
    };

    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(progress));
      saveLabel.textContent = "Bản nháp được lưu trên thiết bị này · Bài làm chỉ gửi khi em nộp";
      saveIndicator.style.background = "#51be8d";
      return true;
    } catch (error) {
      console.error("Không thể lưu bản nháp trong phiên trình duyệt.", error);
      saveLabel.textContent = "Không thể lưu bản nháp trên thiết bị này; đừng đóng trang";
      saveIndicator.style.background = "#d65a5a";
      return false;
    }
  };

  const clearPersistedProgress = () => {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return true;
    } catch (error) {
      console.error("Không thể xóa bản nháp khỏi phiên trình duyệt.", error);
      return false;
    }
  };

  const restoreProgress = () => {
    let savedProgress;
    try {
      const savedValue = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!savedValue) return false;
      savedProgress = JSON.parse(savedValue);
    } catch (error) {
      console.error("Không thể đọc bản nháp trong phiên trình duyệt.", error);
      setStatus("Không thể khôi phục bản nháp trên thiết bị này. Câu trả lời chưa được xóa.");
      return false;
    }

    const validStudent =
      savedProgress?.version === 1 &&
      typeof savedProgress.student?.name === "string" &&
      typeof savedProgress.student?.className === "string";
    const validSession =
      savedProgress?.submitted === true ||
      (typeof savedProgress.session?.id === "string" &&
        typeof savedProgress.session?.token === "string");
    const validAnswers =
      savedProgress.answers &&
      typeof savedProgress.answers === "object" &&
      !Array.isArray(savedProgress.answers);

    if (!validStudent || !validSession || !validAnswers) {
      clearPersistedProgress();
      setStatus("Bản nháp lưu trên thiết bị không hợp lệ. Em vui lòng điểm danh lại.");
      return false;
    }

    studentInfo = savedProgress.student;
    isSubmitted = savedProgress.submitted === true;
    activeSession = isSubmitted ? null : savedProgress.session;
    answerFields.forEach((field) => {
      const answer = savedProgress.answers[field.dataset.answer];
      if (typeof answer === "string") field.value = answer;
    });

    refreshCodeEditor();
    runCode();
    updateStudentView(studentInfo.name, studentInfo.className);

    if (isSubmitted) {
      answerFields.forEach((field) => {
        field.disabled = true;
      });
      finishButton.disabled = true;
      finishButton.innerHTML = 'Đã nộp bài <span aria-hidden="true">✓</span>';
      saveLabel.textContent = "Bài làm đã được lưu trong bảng tính của giáo viên";
      saveIndicator.style.background = "#51be8d";
      setStatus("Bài làm của em đã được nộp thành công.", false);
    } else {
      saveLabel.textContent = "Đã khôi phục bản nháp · Bài làm tự lưu trên thiết bị này";
      saveIndicator.style.background = "#51be8d";
    }
    return true;
  };

  const getResponseFrame = () => {
    if (responseFrame) return responseFrame;
    responseFrame = document.createElement("iframe");
    responseFrame.name = "ha-thanh-submission-response";
    responseFrame.title = "Kết quả gửi bài";
    responseFrame.hidden = true;
    responseFrame.setAttribute("aria-hidden", "true");
    document.body.append(responseFrame);
    window.addEventListener("message", (event) => {
      const response = event.data;
      if (
        response?.source !== "ha-thanh-bai23" ||
        typeof response.requestId !== "string"
      )
        return;
      const pending = pendingRequests.get(response.requestId);
      if (!pending) return;
      clearTimeout(pending.timeout);
      pendingRequests.delete(response.requestId);
      pending.form?.remove();
      if (response.ok) pending.resolve(response);
      else
        pending.reject(
          new Error(
            response.message || "Không thể gửi dữ liệu. Vui lòng thử lại.",
          ),
        );
    });
    return responseFrame;
  };

  const sendRequest = (payload) =>
    new Promise((resolve, reject) => {
      if (!isConfigured) {
        reject(
          new Error("Website chưa được kết nối với bảng tính của giáo viên."),
        );
        return;
      }

      const requestId =
        globalThis.crypto?.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const timeout = setTimeout(() => {
        const pending = pendingRequests.get(requestId);
        pendingRequests.delete(requestId);
        pending?.form?.remove();
        reject(
          new Error(
            "Website chưa nhận được xác nhận. Dữ liệu có thể đã được ghi vào Google Sheet; hãy kiểm tra bảng điểm danh trước khi điểm danh lại.",
          ),
        );
      }, 30000);

      const bridgeForm = document.createElement("form");
      bridgeForm.hidden = true;
      bridgeForm.method = "post";
      bridgeForm.action = SCRIPT_URL;
      bridgeForm.target = getResponseFrame().name;
      bridgeForm.acceptCharset = "UTF-8";
      for (const [name, value] of Object.entries({
        requestId,
        payload: JSON.stringify(payload),
      })) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        bridgeForm.append(input);
      }
      pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout,
        form: bridgeForm,
      });
      document.body.append(bridgeForm);
      bridgeForm.submit();
    });

  const refreshProgress = () => {
    const filled = answerFields.filter((field) => field.value.trim()).length;
    const percent = Math.round((filled / answerFields.length) * 100);
    document.getElementById("progress-value").textContent = `${percent}%`;
    document.getElementById("progress-bar").style.width = `${percent}%`;
  };

  const refreshCodeEditor = () => {
    const lineCount = Math.max(1, websiteCode.value.split("\n").length);
    lineNumbers.textContent = Array.from({ length: lineCount }, (_, index) => index + 1).join("\n");
    const escapedCode = websiteCode.value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    codeHighlight.innerHTML = escapedCode.replace(codeTokenPattern, (token) => {
      let tokenClass = "code-token-number";
      if (token.startsWith("&lt;!--")) tokenClass = "code-token-comment";
      else if (token.startsWith("&lt;") || token === "&gt;") tokenClass = "code-token-tag";
      else if (token.startsWith("&quot;") || token.startsWith("'")) tokenClass = "code-token-string";
      else if (/^(?:const|let|var|function|return|if|else|new|document|true|false)$/i.test(token)) {
        tokenClass = "code-token-keyword";
      }
      return `<span class="${tokenClass}">${token}</span>`;
    }) || " ";
    codeCharacterCount.textContent = `${websiteCode.value.length.toLocaleString("vi-VN")} / 5.000 ký tự`;
    clearTimeout(previewTimer);
    if (isTouchLayout()) {
      codeEditorStatus.textContent = "Mã đã thay đổi. Nhấn Chạy thử để xem kết quả.";
      return;
    }
    previewTimer = setTimeout(() => {
      websitePreview.srcdoc = websiteCode.value;
      codeEditorStatus.textContent = "Bản xem trước đã cập nhật trực tiếp.";
    }, 150);
  };

  const runCode = () => {
    websitePreview.srcdoc = websiteCode.value;
    codeEditorStatus.textContent = "Đã chạy mã và cập nhật bản xem trước.";
  };

  const copyCode = async () => {
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(websiteCode.value);
        copied = true;
      }
    } catch {
      // Fallback below supports browsers that block clipboard access on local files.
    }

    if (!copied) {
      const selectionStart = websiteCode.selectionStart;
      const selectionEnd = websiteCode.selectionEnd;
      try {
        websiteCode.focus();
        websiteCode.select();
        copied = document.execCommand("copy");
        websiteCode.setSelectionRange(selectionStart, selectionEnd);
      } catch {
        copied = false;
      }
    }

    copyCodeButton.textContent = copied ? "✓ Đã sao chép" : "Không sao chép được";
    if (copied) {
      window.setTimeout(() => {
        copyCodeButton.textContent = "⧉ Sao chép";
      }, 1800);
    }
  };

  const resetCodeEditor = () => {
    websiteCode.value = STARTER_WEBSITE_CODE;
    websiteCode.wrap = isTouchLayout() ? "soft" : "off";
    refreshCodeEditor();
    runCode();
  };

  const updateStudentView = (studentName, className) => {
    document.getElementById("student-greeting").textContent =
      `${studentName} · ${className}`;
    document.getElementById("student-initials").textContent = studentName
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((part) => part[0])
      .join("")
      .toLocaleUpperCase("vi");
    refreshProgress();
    attendanceCard.hidden = true;
    lesson.hidden = false;
    requestAnimationFrame(() => {
      revealTargets.forEach((target) => {
        if (!lesson.contains(target)) return;
        revealObserver?.unobserve(target);
        revealObserver?.observe(target);
      });
    });
    document.getElementById("change-student").hidden = false;
  };

  const describeField = (field) => {
    const label = field.closest("label");
    return (
      label?.querySelector("strong")?.textContent.trim() ||
      label?.querySelector(":scope > span")?.textContent.trim() ||
      "mục chưa hoàn thành"
    );
  };

  const incompleteAnswers = () => {
    const missing = answerFields.filter((field) => !field.value.trim());
    if (websiteCode.value.trim() === STARTER_WEBSITE_CODE.trim()) {
      missing.push(websiteCode);
    }
    return missing;
  };

  resetCodeEditor();

  restoreProgress();

  if (!isConfigured) {
    form.querySelector('button[type="submit"]').disabled = true;
    setStatus(
      "Website chưa kết nối với bảng tính. Giáo viên cần hoàn tất cấu hình trước khi chia sẻ liên kết.",
    );
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!isConfigured) return;

    const submitButton = form.querySelector('button[type="submit"]');
    const name = nameInput.value.trim().replace(/\s+/g, " ");
    const className = classInput.value
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleUpperCase("vi");
    if (!name || !className) {
      setStatus("Vui lòng nhập đầy đủ họ tên và lớp.");
      return;
    }

    submitButton.disabled = true;
    setStatus("Đang ghi nhận điểm danh...");
    try {
      const response = await sendRequest({
        action: "checkin",
        name,
        className,
      });
      activeSession = { id: response.sessionId, token: response.sessionToken };
      studentInfo = { name, className };
      isSubmitted = false;
      persistProgress();
      setStatus(`Đã điểm danh cho ${name} · ${className}.`, false);
      updateStudentView(name, className);
    } catch (error) {
      setStatus(error.message);
      submitButton.disabled = false;
    }
  });

  answerFields.forEach((field) => {
    field.required = true;
    field.addEventListener("input", () => {
      field.removeAttribute("aria-invalid");
      field.classList.remove("answer-missing");
      refreshProgress();
      saveLabel.textContent = "Câu trả lời sẽ được gửi khi em nộp bài";
      saveIndicator.style.background = "#e6a14e";
      if (field === websiteCode) refreshCodeEditor();
      persistProgress();
    });
    field.addEventListener("change", () => {
      field.removeAttribute("aria-invalid");
      field.classList.remove("answer-missing");
      refreshProgress();
    });
  });

  websiteCode.addEventListener("scroll", () => {
    lineNumbers.scrollTop = websiteCode.scrollTop;
    lineNumbers.scrollLeft = websiteCode.scrollLeft;
    codeHighlight.scrollTop = websiteCode.scrollTop;
    codeHighlight.scrollLeft = websiteCode.scrollLeft;
  });
  runCodeButton.addEventListener("click", runCode);
  copyCodeButton.addEventListener("click", copyCode);
  window.matchMedia("(max-width: 760px), (pointer: coarse)").addEventListener("change", () => {
    websiteCode.wrap = isTouchLayout() ? "soft" : "off";
  });
  websiteCode.addEventListener("keydown", (event) => {
    if (event.key !== "Tab" || event.shiftKey) return;
    event.preventDefault();
    websiteCode.setRangeText("  ", websiteCode.selectionStart, websiteCode.selectionEnd, "end");
    websiteCode.dispatchEvent(new Event("input", { bubbles: true }));
  });

  finishButton.addEventListener("click", async () => {
    if (!activeSession || finishButton.disabled) return;

    const missing = incompleteAnswers();
    if (missing.length) {
      missing.forEach((field) => {
        field.setAttribute("aria-invalid", "true");
        field.classList.add("answer-missing");
      });
      alert(
        `Em còn ${missing.length} mục chưa có nội dung. Vui lòng hoàn thành toàn bộ bài học trước khi nộp bài.`,
      );
      missing[0].scrollIntoView({ behavior: "smooth", block: "center" });
      missing[0].focus({ preventScroll: true });
      setStatus(
        `Còn ${missing.length} mục chưa hoàn thành. Hãy điền đầy đủ và chỉnh sửa mã website mẫu trước khi nộp bài.`,
      );
      return;
    }

    const answers = Object.fromEntries(
      answerFields.map((field) => [field.dataset.answer, field.value.trim()]),
    );
    finishButton.disabled = true;
    finishButton.innerHTML =
      'Đang gửi bài... <span aria-hidden="true">◷</span>';
    setStatus("Đang gửi bài làm vào bảng tính của giáo viên...");
    saveLabel.textContent = "Đang gửi bài...";
    saveIndicator.style.background = "#e6a14e";
    try {
      await sendRequest({
        action: "submit",
        sessionId: activeSession.id,
        sessionToken: activeSession.token,
        answers,
      });
      isSubmitted = true;
      activeSession = null;
      const progressSaved = persistProgress();
      if (!progressSaved) clearPersistedProgress();
      answerFields.forEach((field) => {
        field.disabled = true;
      });
      document.getElementById("progress-value").textContent = "100%";
      document.getElementById("progress-bar").style.width = "100%";
      saveLabel.textContent = progressSaved
        ? "Bài làm đã được lưu trong bảng tính của giáo viên"
        : "Đã nộp bài; trình duyệt không lưu được trạng thái nộp";
      saveIndicator.style.background = "#51be8d";
      finishButton.innerHTML = 'Đã nộp bài <span aria-hidden="true">✓</span>';
      setStatus("Đã nộp bài thành công. Cảm ơn em!", false);
    } catch (error) {
      finishButton.disabled = false;
      finishButton.innerHTML = 'Thử gửi lại <span aria-hidden="true">↻</span>';
      saveLabel.textContent = "Chưa nhận được xác nhận lưu bài";
      saveIndicator.style.background = "#d65a5a";
      setStatus(error.message);
    }
  });

  document.getElementById("change-student").addEventListener("click", () => {
    activeSession = null;
    studentInfo = null;
    isSubmitted = false;
    const cleared = clearPersistedProgress();
    lesson.hidden = true;
    attendanceCard.hidden = false;
    form.reset();
    answerFields.forEach((field) => {
      field.value = "";
      field.disabled = false;
      field.removeAttribute("aria-invalid");
      field.classList.remove("answer-missing");
    });
    resetCodeEditor();
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = !isConfigured;
    finishButton.disabled = false;
    finishButton.innerHTML = 'Nộp bài <span aria-hidden="true">✓</span>';
    saveLabel.textContent = "Bài làm chỉ được gửi sau khi em nộp bài";
    saveIndicator.style.background = "#51be8d";
    refreshProgress();
    setStatus(
      cleared
        ? ""
        : "Không thể xóa bản nháp khỏi thiết bị. Vui lòng đóng tab sau khi đổi học sinh.",
      !cleared,
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();
