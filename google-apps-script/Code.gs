const SHEET_NAME = "DiemDanh_Bai23";
const ANSWER_FIELDS = [
  ["warmupSites", "Website em thường truy cập"],
  ["warmupFactors", "Yếu tố của website hấp dẫn"],
  ["shopeePurpose", "Mục đích của Shopee"],
  ["shopeeAudience", "Đối tượng người dùng Shopee"],
  ["shopeeNeeds", "Nhu cầu khi truy cập Shopee"],
  ["shopeeEvaluation", "Đánh giá Shopee"],
  ["vnHeader", "VNExpress - Header"],
  ["vnLeft", "VNExpress - Cột trái"],
  ["vnMain", "VNExpress - Nội dung chính"],
  ["vnRight", "VNExpress - Cột phải"],
  ["vnFooter", "VNExpress - Footer"],
  ["vnDiagram", "VNExpress - Sơ đồ bố cục"],
  ["shopHeader", "Shopee - Header"],
  ["shopBody", "Shopee - Khối nội dung"],
  ["shopFooter", "Shopee - Footer"],
  ["shopDiagram", "Shopee - Sơ đồ bố cục"],
  ["designWebsite", "Trang web lựa chọn"],
  ["designFont", "Thiết kế - Phông chữ"],
  ["designColor", "Thiết kế - Màu chủ đạo"],
  ["designType", "Thiết kế - Kiểu chữ"],
  ["designImages", "Thiết kế - Hình ảnh"],
  ["schoolName", "Website trường - Tên"],
  ["schoolSlogan", "Website trường - Slogan"],
  ["schoolContent", "Website trường - Nội dung"],
  ["schoolHeader", "Website trường - Header"],
  ["schoolBody", "Website trường - Body"],
  ["schoolFooter", "Website trường - Footer"],
  ["reviewLayout", "Nhận xét - Bố cục"],
  ["reviewColor", "Nhận xét - Màu sắc"],
  ["reviewExperience", "Nhận xét - Trải nghiệm người dùng"]
];
const BASE_HEADERS = [
  "Thời gian điểm danh",
  "Họ và tên",
  "Lớp",
  "Trạng thái bài",
  "Thời gian nộp bài"
];
const SESSION_ID_HEADER = "Mã phiên (nội bộ)";
const TOKEN_HASH_HEADER = "Mã xác thực (nội bộ)";

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Bài học Bài 23")
    .addItem("Khởi tạo bảng điểm danh", "setupAttendance")
    .addToUi();
}

function setupAttendance() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error("Hãy mở Apps Script từ bảng tính dùng để lưu điểm danh.");
  }
  PropertiesService.getScriptProperties().setProperty("ATTENDANCE_SPREADSHEET_ID", spreadsheet.getId());
  const sheet = getOrCreateSheet_(spreadsheet);
  SpreadsheetApp.getUi().alert(`Đã sẵn sàng lưu dữ liệu trong trang tính "${sheet.getName()}".`);
}

function doGet() {
  return ContentService.createTextOutput("Đây là dịch vụ lưu bài học. Hãy mở đường dẫn website do giáo viên chia sẻ.");
}

function doPost(event) {
  const requestId = String(event?.parameter?.requestId || "").slice(0, 100);
  let response;
  try {
    const rawPayload = event?.parameter?.payload;
    if (!rawPayload || rawPayload.length > 200000) {
      throw userError_("Dữ liệu gửi lên không hợp lệ. Vui lòng tải lại trang và thử lại.");
    }

    const payload = JSON.parse(rawPayload);
    if (payload.action === "checkin") {
      response = registerStudent_(payload);
    } else if (payload.action === "submit") {
      response = saveStudentAnswers_(payload);
    } else {
      throw userError_("Yêu cầu không hợp lệ. Vui lòng tải lại trang và thử lại.");
    }
    response.ok = true;
  } catch (error) {
    console.error(error && error.stack ? error.stack : String(error));
    response = {
      ok: false,
      message: error && error.isUserError
        ? error.message
        : "Không thể ghi dữ liệu vào bảng tính. Vui lòng thử lại hoặc báo giáo viên."
    };
  }
  response.source = "ha-thanh-bai23";
  response.requestId = requestId;
  return createResponsePage_(response);
}

function registerStudent_(payload) {
  const name = normalizeIdentity_(payload.name, 80, "họ và tên");
  const className = normalizeIdentity_(payload.className, 20, "lớp").toLocaleUpperCase("vi");
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getAttendanceSheet_();
    const sessionId = Utilities.getUuid();
    const sessionToken = Utilities.getUuid();
    const values = [
      new Date(),
      safeSheetText_(name),
      safeSheetText_(className),
      "Đang học",
      "",
      ...ANSWER_FIELDS.map(() => ""),
      sessionId,
      hashToken_(sessionToken)
    ];
    sheet.getRange(sheet.getLastRow() + 1, 1, 1, values.length).setValues([values]);
    return { sessionId, sessionToken };
  } finally {
    lock.releaseLock();
  }
}

function saveStudentAnswers_(payload) {
  const sessionId = String(payload.sessionId || "");
  const sessionToken = String(payload.sessionToken || "");
  if (!/^[\da-f-]{36}$/i.test(sessionId) || !/^[\da-f-]{36}$/i.test(sessionToken)) {
    throw userError_("Phiên làm bài không hợp lệ. Vui lòng điểm danh lại.");
  }
  if (!payload.answers || typeof payload.answers !== "object" || Array.isArray(payload.answers)) {
    throw userError_("Không nhận được câu trả lời. Vui lòng kiểm tra bài làm và thử lại.");
  }

  const answers = ANSWER_FIELDS.map(([key]) => {
    const answer = typeof payload.answers[key] === "string" ? payload.answers[key].trim() : "";
    if (!answer) {
      throw userError_("Bài làm còn nội dung chưa hoàn thành. Vui lòng điền tất cả câu trả lời rồi nộp lại.");
    }
    if (answer.length > 5000) {
      throw userError_("Một câu trả lời vượt quá giới hạn 5.000 ký tự.");
    }
    return safeSheetText_(answer);
  });

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getAttendanceSheet_();
    const lastRow = sheet.getLastRow();
    const sessionColumn = BASE_HEADERS.length + ANSWER_FIELDS.length + 1;
    const tokenColumn = sessionColumn + 1;
    if (lastRow < 2) throw userError_("Không tìm thấy lượt điểm danh. Vui lòng điểm danh lại.");

    const match = sheet.getRange(2, sessionColumn, lastRow - 1, 1)
      .createTextFinder(sessionId)
      .matchEntireCell(true)
      .findNext();
    if (!match || sheet.getRange(match.getRow(), tokenColumn).getDisplayValue() !== hashToken_(sessionToken)) {
      throw userError_("Không xác thực được lượt điểm danh. Vui lòng điểm danh lại.");
    }

    const row = match.getRow();
    if (sheet.getRange(row, 4).getValue() === "Đã nộp") {
      return { alreadySubmitted: true };
    }

    const updatedRow = sheet.getRange(row, 1, 1, BASE_HEADERS.length + ANSWER_FIELDS.length + 2).getValues()[0];
    updatedRow[3] = "Đã nộp";
    updatedRow[4] = new Date();
    answers.forEach((answer, index) => {
      updatedRow[BASE_HEADERS.length + index] = answer;
    });
    sheet.getRange(row, 1, 1, updatedRow.length).setValues([updatedRow]);
    return { submitted: true };
  } finally {
    lock.releaseLock();
  }
}

function getAttendanceSheet_() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty("ATTENDANCE_SPREADSHEET_ID");
  if (!spreadsheetId) {
    throw userError_("Bảng điểm danh chưa được thiết lập. Giáo viên cần khởi tạo bảng tính trước khi chia sẻ website.");
  }
  return getOrCreateSheet_(SpreadsheetApp.openById(spreadsheetId));
}

function getOrCreateSheet_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
  const headers = [
    ...BASE_HEADERS,
    ...ANSWER_FIELDS.map(([, label]) => label),
    SESSION_ID_HEADER,
    TOKEN_HASH_HEADER
  ];
  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground("#6754e8")
      .setFontColor("#ffffff")
      .setFontWeight("bold")
      .setWrap(true);
    sheet.setRowHeight(1, 42);
  } else {
    const existing = sheet.getRange(1, 1, 1, headers.length).getDisplayValues()[0];
    if (headers.some((header, index) => existing[index] !== header)) {
      throw userError_(`Trang tính "${SHEET_NAME}" đã tồn tại nhưng tiêu đề không đúng. Hãy đổi tên hoặc xóa trang tính đó rồi khởi tạo lại.`);
    }
  }
  sheet.hideColumns(headers.length - 1, 2);
  return sheet;
}

function normalizeIdentity_(value, limit, fieldName) {
  const normalized = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (!normalized || normalized.length > limit) {
    throw userError_(`Vui lòng nhập ${fieldName} hợp lệ (tối đa ${limit} ký tự).`);
  }
  return normalized;
}

function safeSheetText_(value) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function hashToken_(token) {
  return Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    token,
    Utilities.Charset.UTF_8
  ).map((byte) => (`0${(byte & 0xff).toString(16)}`).slice(-2)).join("");
}

function userError_(message) {
  const error = new Error(message);
  error.isUserError = true;
  return error;
}

function createResponsePage_(response) {
  const serializedResponse = JSON.stringify(response)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return HtmlService.createHtmlOutput(
    `<!doctype html><html lang="vi"><head><meta charset="utf-8"></head><body><script>window.top.postMessage(${serializedResponse}, "*");</script></body></html>`
  ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
