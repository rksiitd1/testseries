(() => {
  const $ = id => document.getElementById(id);
  const githubRoot = 'https://github.com/rksiitd1/testseries/blob/main/';
  const githubRawRoot = 'https://raw.githubusercontent.com/rksiitd1/testseries/main/';
  const today = () => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date()).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  };
  const dateText = (date, options) => new Date(`${date}T00:00:00+05:30`)
    .toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', ...options });

  function parse(name) {
    const branded = name.match(/^SHRI_(\d{4}-\d{2}-\d{2})-(.+)$/);
    const dated = name.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
    const match = branded || dated;
    if (!match) return null;

    const date = match[1];
    const isBranded = Boolean(branded);
    const base = match[2].replace(/\.(html|pdf)$/i, '');
    const classMatch = base.match(/^(.*?)-Class-(10th|12th)-(.*)$/);
    if (!classMatch) return null;

    const tail = classMatch[3];
    const chapterMatch = tail.match(/^(Chapter-\d+|All-Chapters)(?:-question-paper(?:-english)?(?:-\d+)?|-AnswerKey-16-Up-Duplex(?:-\d+)?)?$/);
    if (!chapterMatch) return null;

    return {
      name, date, branded: isBranded, key: tail.includes('-AnswerKey-'),
      subject: classMatch[1] === 'Social-Science' ? 'Social Science' : classMatch[1],
      classNumber: classMatch[2].slice(0, 2),
      chapter: chapterMatch[1] === 'All-Chapters' ? 'All Chapters' : chapterMatch[1].replace('-', ' '),
      version: /(?:question-paper|AnswerKey-16-Up-Duplex)-(\d+)$/.exec(tail)?.[1] || '1',
      english: /-english(?:-\d+)?$/.test(tail),
      html: /\.html$/i.test(name)
    };
  }

  function makeLink(file, label, style) {
    const link = document.createElement('a');
    link.className = `action ${style}`;
    link.href = file.url || encodeURI(file.name);
    link.textContent = label;
    link.setAttribute('aria-label', `${label}: ${file.name}`);
    return link;
  }

  async function loadArchiveData() {
    const embedded = $('archive-data');
    if (embedded) {
      try {
        const snapshot = JSON.parse(embedded.textContent);
        if (Array.isArray(snapshot.files) && Array.isArray(snapshot.forms)) return snapshot;
      } catch {}
    }

    const [papersResponse, formsResponse] = await Promise.all([
      fetch(`${githubRawRoot}papers.json`),
      fetch(`${githubRawRoot}forms.json`).catch(() => null)
    ]);
    if (!papersResponse.ok) throw new Error(`GitHub paper manifest request failed (${papersResponse.status})`);
    const papers = await papersResponse.json();
    let forms = { forms: [] };
    if (formsResponse?.ok) {
      try { forms = await formsResponse.json(); } catch {}
    }
    return {
      files: (papers.files || []).map(name => ({
        name,
        url: `${githubRoot}${encodeURIComponent(name)}`
      })),
      forms: Array.isArray(forms.forms) ? forms.forms : []
    };
  }

  function makeFormLink(file, label) {
    const link = document.createElement('a');
    link.className = 'action form';
    link.href = file.formUrl;
    link.textContent = label;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', `${label}: ${file.name}`);
    return link;
  }

  function makePaperCard(group) {
    const card = document.createElement('article');
    card.className = 'subject-card';
    const heading = document.createElement('div');
    heading.className = 'subject-head';
    const subject = document.createElement('h3');
    subject.className = 'subject-name';
    subject.textContent = group.subject;
    const chapter = document.createElement('span');
    chapter.className = 'chapter';
    chapter.textContent = `${group.chapter}${group.version !== '1' ? ` · Paper ${group.version}` : ''}`;
    heading.append(subject, chapter);
    card.append(heading);

    const actions = document.createElement('div');
    actions.className = 'actions';
    const paperFiles = group.files.filter(file => !file.key && !file.html);
    const bilingual = group.files.some(file => file.english);
    const primaryFiles = [];
    for (const english of (bilingual ? [false, true] : [false])) {
      const candidates = paperFiles.filter(file => file.english === english);
      const selected = candidates.find(file => file.branded) || candidates[0];
      if (!selected) continue;
      primaryFiles.push(selected);
      const label = `${selected.branded ? 'Branded ' : ''}Question paper${bilingual ? ` · ${english ? 'English' : 'Hindi'}` : ''}`;
      actions.append(makeLink(selected, label, english ? 'english' : 'paper'));
    }

    const formFiles = group.files.filter(file => file.formUrl && file.html && !file.key);
    for (const file of formFiles) {
      actions.append(makeFormLink(file, bilingual ? `Take quiz · ${file.english ? 'English' : 'Hindi'}` : 'Take quiz'));
    }

    const answerKey = group.files.find(file => file.key && !file.html);
    if (answerKey) actions.append(makeLink(answerKey, 'Answer key', 'key'));
    if (!actions.children.length) {
      const missing = document.createElement('span');
      missing.className = 'chapter';
      missing.textContent = 'No paper or answer-key PDF found';
      actions.append(missing);
    }
    card.append(actions);

    const otherFiles = group.files.filter(file => !primaryFiles.includes(file) && file !== answerKey);
    if (otherFiles.length) {
      const details = document.createElement('details');
      details.className = 'more';
      const summary = document.createElement('summary');
      summary.textContent = 'Other files';
      const links = document.createElement('div');
      links.className = 'more-links';
      for (const file of otherFiles) {
        let label;
        if (file.key) label = file.html ? 'Answer key · HTML' : 'Answer key · PDF';
        else if (file.html) label = file.english ? 'English paper · HTML' : 'HTML source';
        else label = `${file.english ? 'English' : 'Hindi'} paper · ${file.branded ? 'Branded' : 'Unbranded'} PDF`;
        links.append(makeLink(file, label, 'quiet'));
      }
      details.append(summary, links);
      card.append(details);
    }
    return card;
  }

  function makeClassRow(classNumber, groups) {
    const row = document.createElement('div');
    row.className = 'class-row';
    const label = document.createElement('div');
    label.className = 'class-label';
    label.innerHTML = `<span>Test series</span><strong>Class ${classNumber}</strong>`;
    const subjects = document.createElement('div');
    subjects.className = 'subject-list';
    if (!groups.length) {
      const off = document.createElement('div');
      off.className = 'off';
      off.textContent = 'No test listed';
      subjects.append(off);
    } else {
      groups.forEach(group => subjects.append(makePaperCard(group)));
    }
    row.append(label, subjects);
    return row;
  }

  function makeSchedule(files) {
    const groups = new Map();
    for (const file of files) {
      const key = [file.date, file.classNumber, file.subject, file.chapter, file.version].join('|');
      if (!groups.has(key)) groups.set(key, {
        date: file.date, classNumber: file.classNumber, subject: file.subject,
        chapter: file.chapter, version: file.version, files: []
      });
      groups.get(key).files.push(file);
    }

    const days = new Map();
    for (const group of groups.values()) {
      if (!days.has(group.date)) days.set(group.date, { date: group.date, ten: [], twelve: [] });
      (group.classNumber === '10' ? days.get(group.date).ten : days.get(group.date).twelve).push(group);
    }
    return [...days.values()].sort((a, b) => b.date.localeCompare(a.date));
  }

  async function init() {
    const timeline = $('timeline');
    timeline.textContent = 'Loading papers…';
    try {
      const archive = await loadArchiveData();
      const formsByPaper = new Map();
      for (const form of archive.forms) {
        if (typeof form.paper !== 'string' || typeof form.studentUrl !== 'string') continue;
        try {
          const url = new URL(form.studentUrl);
          if (url.protocol === 'https:' && url.hostname === 'docs.google.com' && /^\/forms\/d\/e\/[^/]+\/viewform\/?$/.test(url.pathname)) {
            formsByPaper.set(form.paper, url.href);
          }
        } catch {}
      }
      const files = archive.files.map(entry => {
        const name = typeof entry === 'string' ? entry : entry?.name;
        if (!name) return null;
        const file = parse(name);
        if (file) {
          file.url = typeof entry === 'object' && entry.url ? entry.url : encodeURI(name);
          if (formsByPaper.has(name)) file.formUrl = formsByPaper.get(name);
        }
        return file;
      }).filter(Boolean);
      const days = makeSchedule(files);
      const currentDate = today();

      $('completed-count').textContent = days
        .filter(day => day.date <= currentDate)
        .reduce((count, day) => count + day.ten.length + day.twelve.length, 0);
      $('archive-range').textContent = days.length
        ? `${dateText(days[days.length - 1].date, { day: 'numeric', month: 'short' })}–${dateText(days[0].date, { day: 'numeric', month: 'short', year: 'numeric' })}`
        : 'No papers found';

      const jump = $('jump');
      jump.replaceChildren();
      for (const day of days) {
        const link = document.createElement('a');
        link.href = `#day-${day.date}`;
        link.textContent = `${Number(day.date.slice(-2))} ${dateText(day.date, { month: 'short' })}`;
        jump.append(link);
      }

      function render() {
        const query = $('search').value.trim().toLowerCase();
        timeline.replaceChildren();
        let shown = 0;
        for (const day of days) {
          const groups = [...day.ten, ...day.twelve];
          const searchable = `${day.date} ${dateText(day.date, { weekday: 'long' })} ${groups.map(group => `${group.classNumber} ${group.subject} ${group.chapter}`).join(' ')}`.toLowerCase();
          if (query && !searchable.includes(query)) continue;
          shown++;

          const article = document.createElement('article');
          article.className = 'day';
          article.id = `day-${day.date}`;
          const date = document.createElement('div');
          date.className = 'date-col';
          for (const [className, text] of [
            ['date-month', dateText(day.date, { month: 'long', year: 'numeric' })],
            ['date-number', String(Number(day.date.slice(-2)))],
            ['date-weekday', dateText(day.date, { weekday: 'long' })]
          ]) {
            const item = document.createElement('span');
            item.className = className;
            item.textContent = text;
            date.append(item);
          }
          if (day.date >= currentDate) {
            const tag = document.createElement('span');
            tag.className = 'today-tag';
            tag.textContent = day.date === currentDate ? 'Today' : 'Upcoming';
            date.append(tag);
          }
          const sessions = document.createElement('div');
          sessions.className = 'sessions';
          sessions.append(makeClassRow('10', day.ten), makeClassRow('12', day.twelve));
          article.append(date, sessions);
          timeline.append(article);
        }
        if (!shown) {
          const empty = document.createElement('div');
          empty.className = 'empty-result';
          empty.textContent = 'No dates match that search.';
          timeline.append(empty);
        }
      }

      render();
      $('search').addEventListener('input', render);
    } catch (error) {
      timeline.replaceChildren();
      const message = document.createElement('div');
      message.className = 'empty-result';
      message.textContent = `Could not load the paper manifest: ${error.message}`;
      timeline.append(message);
    }
  }

  init();
})();
