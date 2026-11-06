(() => {
  const SCRIPT_URL = "PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";
  const isConfigured = /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(SCRIPT_URL);
  const form = document.getElementById("attendance-form");
  const nameInput = document.getElementById("student-name");
  const classInput = document.getElementById("student-class");
  const status = document.getElementById("app-status");
  const lesson = document.getElementById("lesson-area");
  const attendanceCard = document.getElementById("attendance-card");
  const answerFields = [...document.querySelectorAll("[data-answer]")];
  const saveLabel = document.getElementById("save-label");
  const saveIndicator = document.getElementById("save-indicator");
  const finishButton = document.getElementById("finish-lesson");
  const pendingRequests = new Map();
  let activeSession = null;
  let responseFrame = null;

  const setStatus = (message, isError = true) => {
    status.textContent = message;
    status.classList.toggle("status-success", !isError);
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
      if (event.source !== responseFrame.contentWindow) return;
      const response = event.data;
      if (response?.source !== "ha-thanh-bai23" || typeof response.requestId !== "string") return;
      const pending = pendingRequests.get(response.requestId);
      if (!pending) return;
      clearTimeout(pending.timeout);
      pendingRequests.delete(response.requestId);
      pending.form?.remove();
      if (response.ok) pending.resolve(response);
      else pending.reject(new Error(response.message || "Không thể gửi dữ liệu. Vui lòng thử lại."));
    });
    return responseFrame;
  };

  const sendRequest = (payload) => new Promise((resolve, reject) => {
    if (!isConfigured) {
      reject(new Error("Website chưa được kết nối với bảng tính của giáo viên."));
      return;
    }

    const requestId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const timeout = setTimeout(() => {
      const pending = pendingRequests.get(requestId);
      pendingRequests.delete(requestId);
      pending?.form?.remove();
      reject(new Error("Chưa nhận được phản hồi từ bảng tính. Vui lòng kiểm tra kết nối mạng và thử lại."));
    }, 30000);

    const bridgeForm = document.createElement("form");
    bridgeForm.hidden = true;
    bridgeForm.method = "post";
    bridgeForm.action = SCRIPT_URL;
    bridgeForm.target = getResponseFrame().name;
    bridgeForm.acceptCharset = "UTF-8";
    for (const [name, value] of Object.entries({
      requestId,
      payload: JSON.stringify(payload)
    })) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      bridgeForm.append(input);
    }
    pendingRequests.set(requestId, { resolve, reject, timeout, form: bridgeForm });
    document.body.append(bridgeForm);
    bridgeForm.submit();
  });

  const refreshProgress = () => {
    const filled = answerFields.filter((field) => field.value.trim()).length;
    const percent = Math.round((filled / answerFields.length) * 100);
    document.getElementById("progress-value").textContent = `${percent}%`;
    document.getElementById("progress-bar").style.width = `${percent}%`;
  };

  const updateStudentView = (studentName, className) => {
    document.getElementById("student-greeting").textContent = `${studentName} · ${className}`;
    document.getElementById("student-initials").textContent = studentName.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("").toLocaleUpperCase("vi");
    refreshProgress();
    attendanceCard.hidden = true;
    lesson.hidden = false;
    document.getElementById("change-student").hidden = false;
  };

  const describeField = (field) => {
    const label = field.closest("label");
    return label?.querySelector("strong")?.textContent.trim()
      || label?.querySelector(":scope > span")?.textContent.trim()
      || "mục chưa hoàn thành";
  };

  const incompleteAnswers = () => answerFields.filter((field) => !field.value.trim());

  if (!isConfigured) {
    form.querySelector('button[type="submit"]').disabled = true;
    setStatus("Website chưa kết nối với bảng tính. Giáo viên cần hoàn tất cấu hình trước khi chia sẻ liên kết.");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!isConfigured) return;

    const submitButton = form.querySelector('button[type="submit"]');
    const name = nameInput.value.trim().replace(/\s+/g, " ");
    const className = classInput.value.trim().replace(/\s+/g, " ").toLocaleUpperCase("vi");
    if (!name || !className) {
      setStatus("Vui lòng nhập đầy đủ họ tên và lớp.");
      return;
    }

    submitButton.disabled = true;
    setStatus("Đang ghi nhận điểm danh...");
    try {
      const response = await sendRequest({ action: "checkin", name, className });
      activeSession = { id: response.sessionId, token: response.sessionToken };
      setStatus(`Đã điểm danh cho ${name} · ${className}.`, false);
      saveLabel.textContent = "Câu trả lời sẽ được gửi khi em nộp bài";
      saveIndicator.style.background = "#e6a14e";
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
    });
    field.addEventListener("change", () => {
      field.removeAttribute("aria-invalid");
      field.classList.remove("answer-missing");
      refreshProgress();
    });
  });

  finishButton.addEventListener("click", async () => {
    if (!activeSession || finishButton.disabled) return;

    const missing = incompleteAnswers();
    if (missing.length) {
      missing.forEach((field) => {
        field.setAttribute("aria-invalid", "true");
        field.classList.add("answer-missing");
      });
      alert(`Em còn ${missing.length} mục chưa có nội dung. Vui lòng hoàn thành toàn bộ bài học trước khi nộp bài.`);
      missing[0].scrollIntoView({ behavior: "smooth", block: "center" });
      missing[0].focus({ preventScroll: true });
      setStatus(`Còn ${missing.length} mục chưa hoàn thành. Hãy điền đầy đủ trước khi nộp bài.`);
      return;
    }

    const answers = Object.fromEntries(answerFields.map((field) => [field.dataset.answer, field.value.trim()]));
    finishButton.disabled = true;
    finishButton.innerHTML = 'Đang gửi bài... <span aria-hidden="true">◷</span>';
    setStatus("Đang gửi bài làm vào bảng tính của giáo viên...");
    saveLabel.textContent = "Đang gửi bài...";
    saveIndicator.style.background = "#e6a14e";
    try {
      await sendRequest({
        action: "submit",
        sessionId: activeSession.id,
        sessionToken: activeSession.token,
        answers
      });
      answerFields.forEach((field) => { field.disabled = true; });
      document.getElementById("progress-value").textContent = "100%";
      document.getElementById("progress-bar").style.width = "100%";
      saveLabel.textContent = "Bài làm đã được lưu trong bảng tính của giáo viên";
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
    lesson.hidden = true;
    attendanceCard.hidden = false;
    form.reset();
    answerFields.forEach((field) => {
      field.value = "";
      field.disabled = false;
      field.removeAttribute("aria-invalid");
      field.classList.remove("answer-missing");
    });
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = !isConfigured;
    finishButton.disabled = false;
    finishButton.innerHTML = 'Nộp bài <span aria-hidden="true">✓</span>';
    saveLabel.textContent = "Bài làm chỉ được gửi sau khi em nộp bài";
    saveIndicator.style.background = "#51be8d";
    refreshProgress();
    setStatus("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();
