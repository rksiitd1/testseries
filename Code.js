function testConnection() {
  return "OK";
}

function authorizeShriFormsAccess() {
  try {
    FormApp.openById("1").getTitle();
  } catch (error) {
    // The expected invalid-ID error confirms the Forms service is reachable;
    // the authorization prompt is handled by Apps Script before this runs.
  }
  return "Forms access authorized";
}

function createShriClassesForm(payload) {
  if (!payload || !payload.title || !payload.jobId || !payload.description || !Array.isArray(payload.questions)) {
    throw new Error("Missing jobId, title, description, or questions.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const properties = PropertiesService.getScriptProperties();
    const propertyKey = "SHRI_FORM_JOB_" + payload.jobId;
    const existing = properties.getProperty(propertyKey);
    if (existing) return JSON.parse(existing);

  const questions = payload.questions;
  const answers = payload.answers;

  if (!Array.isArray(answers) || answers.length !== questions.length) {
    throw new Error("Question and answer counts do not match.");
  }

  questions.forEach((q, i) => {
    if (typeof q.title !== "string" || !q.title.trim() || !Array.isArray(q.options) || q.options.length !== 4 || q.options.some(option => typeof option !== "string" || !option.trim())) {
      throw new Error("Invalid question at position " + (i + 1));
    }
    if (!["A", "B", "C", "D"].includes(answers[i])) {
      throw new Error("Invalid answer at position " + (i + 1));
    }
  });

  const form = FormApp.create(payload.title);
  form.setDescription(payload.description);
  form.setIsQuiz(true);
  form.setShuffleQuestions(true);
  form.setCollectEmail(true);

  form.addSectionHeaderItem().setTitle("Student Details");
  form.addTextItem().setTitle("Student Name").setRequired(true);
  form.addTextItem().setTitle("Mobile Number").setRequired(true);
  form.addTextItem().setTitle("Email ID").setRequired(true);

  form.addPageBreakItem().setTitle("Family and School Details");
  form.addTextItem().setTitle("Father's Name").setRequired(true);
  form.addTextItem().setTitle("Mother's Name").setRequired(true);
  form.addTextItem().setTitle("School Name").setRequired(true);
  form.addParagraphTextItem().setTitle("Address").setRequired(true);

  form.addPageBreakItem().setTitle("Questions 1–" + Math.min(12, questions.length));

  questions.forEach((q, i) => {
    if (i > 0 && i % 12 === 0) {
      form.addPageBreakItem().setTitle("Questions " + (i + 1) + "–" + Math.min(i + 12, questions.length));
    }

    const item = form.addMultipleChoiceItem();
    const correctIndex = ["A", "B", "C", "D"].indexOf(answers[i]);
    const choices = q.options.map((option, j) =>
      item.createChoice(option, j === correctIndex)
    );

    item.setTitle(q.title)
      .setChoices(choices)
      .setRequired(false)
      .setPoints(1);
  });

  const result = {
    title: payload.title,
    editUrl: form.getEditUrl(),
    studentUrl: form.getPublishedUrl(),
    questionCount: questions.length
  };
  properties.setProperty(propertyKey, JSON.stringify(result));
  return result;
  } finally {
    lock.releaseLock();
  }
}
