import html, json, re, subprocess
from collections import Counter
from pathlib import Path
from html.parser import HTMLParser

root=Path(__file__).parent
stem='2026-10-26-Biology-Class-10th-Chapter-2'
paper=root/f'{stem}-question-paper.html'
keyfile=root/f'{stem}-AnswerKey-16-Up-Duplex.html'
record=json.loads((root/f'{stem}-record.json').read_text(encoding='utf-8'))
src=Path(r'C:\Users\RATNESH\.codex\attachments\7eb1b485-51c8-4059-a331-bb116d16c1bb\Pasted text.txt').read_text(encoding='utf-8')
raw=paper.read_text(encoding='utf-8')
keyraw=keyfile.read_text(encoding='utf-8')
assert f'<title>{stem}-question-paper</title>' in raw
assert f'<title>{stem}-AnswerKey-16-Up-Duplex</title>' in keyraw
assert 'अध्याय 2 | वस्तुनिष्ठ प्रश्न | कक्षा 10 | परीक्षा तिथि: 2026-10-26' in raw
assert 'const CHAPTER = "2";' in keyraw and 'const CLASS = "10";' in keyraw and 'const TEST_DATE = "2026-10-26";' in keyraw
blocks=re.findall(r'<div class="q">(.*?)</div>\s*</div>',raw,re.S)
# Parse each complete .q block independently; the embedded option group closes first.
qblocks=re.findall(r'(<div class="q">.*?</div>\s*</div>)',raw,re.S)
assert len(qblocks)==100, f'Expected 100 question blocks, got {len(qblocks)}'
letters=re.findall(r'const KEY = \[(.*?)\];',keyraw,re.S)[0]
answers=re.findall(r'"([ABCD])"',letters)
assert len(answers)==100 and set(answers)<=set('ABCD')
assert answers==[q['answer'] for q in record['questions']]
for i,(block,q) in enumerate(zip(qblocks,record['questions']),1):
    m=re.search(r'<span class="t">(\d+)\. (.*?)</span>',block,re.S)
    assert m and int(m.group(1))==i
    assert html.unescape(m.group(2))==q['question'], f'question text mismatch at {i}'
    opts=re.findall(r'<div>\(([A-D])\) (.*?)</div>',block,re.S)
    assert len(opts)==4 and [x[0] for x in opts]==list('ABCD'),f'option structure at {i}'
    values={letter:html.unescape(value) for letter,value in opts}
    assert values==q['options'],f'option mismatch at {i}'
    assert values[q['answer']]==q['answer_text'],f'key/text mismatch at {i}'
counts=Counter(answers)
streak=max((len(list(g)) for _,g in __import__('itertools').groupby(answers)),default=0)
assert counts==Counter({'A':25,'B':25,'C':25,'D':25})
assert streak<=2
assert len({q['question'] for q in record['questions']})==100
assert src.startswith('यहाँ दी गई छवियों के आधार पर')
pdfs=[root/f'{stem}-question-paper.pdf',root/f'{stem}-AnswerKey-16-Up-Duplex.pdf']
infos=[subprocess.check_output(['pdfinfo',str(p)],text=True,encoding='utf-8',errors='replace') for p in pdfs]
page_counts=[int(re.search(r'^Pages:\s+(\d+)$', info, re.M).group(1)) for info in infos]
assert page_counts[0] >= 2 and page_counts[1] == 2
assert 'Title:           '+stem+'-question-paper' in infos[0]
assert 'Title:           '+stem+'-AnswerKey-16-Up-Duplex' in infos[1]
audit=f'''# Biology Class 10 Chapter 2: श्वसन — audit

- परीक्षा तिथि: 2026-10-26 (corrected per user's latest instruction).
- स्रोत: उपयोगकर्ता द्वारा संलग्न अध्याय-पाठ transcription; कोई PYQ या अन्य chapter/source नहीं जोड़ा गया। संलग्न पाठ स्वयं बताता है कि धुंधली छवि के कारण कुछ हिस्सा अनुमानित है।
- 100 MCQ: {len(record['questions'])} प्रश्न, प्रत्येक में चार विकल्प; कोई प्रश्न/विकल्प खाली नहीं। विषय-वितरण क्रमशः कोशिकीय श्वसन/ATP व प्रयोग (24), पौधों में गैस-विनिमय (13), जंतुओं के श्वसन अंग (16), मानव श्वसन-तंत्र एवं गैस-विनिमय/श्वास-यांत्रिकी (47)।
- अंतिम सहेजे HTML से प्रश्न, चारों विकल्प और सही विकल्प को authoritative record से 100/100 मिलाया। अंतिम answer-key HTML की 100 entries को प्रश्नों के सही विकल्पों से मिलाया; सभी सही।
- उत्तर-वितरण A=25, B=25, C=25, D=25; अधिकतम समान उत्तरों की लगातार श्रृंखला {streak}।
- PDF शीर्षक फ़ाइल stems से मेल खाते हैं। प्रश्न-पत्र {page_counts[0]} A4 पृष्ठ, उत्तर-कुंजी {page_counts[1]} A4 पृष्ठ है; सभी पृष्ठ रेंडर कर दृश्य रूप से देखे गए।
- वैज्ञानिक संपादन: स्रोत में CO₂ के हीमोग्लोबिन से जुड़ने के उत्पाद के लिए “कार्बोक्सीहीमोग्लोबिन” लिखा था; संभावित पाठ/वैज्ञानिक त्रुटि के कारण उस विशिष्ट दावे पर प्रश्न शामिल नहीं किया गया। बाकी प्रश्न दिए गए transcription की सीमा में रखे गए हैं।
- सीमा: यह पूरा प्रश्नपत्र उपलब्ध transcription के अध्ययन पर आधारित है; छवियों से परे मूल मुद्रित अध्याय की स्वतंत्र पंक्ति-दर-पंक्ति पुष्टि नहीं की गई।
'''
(root/f'{stem}-audit.md').write_text(audit,encoding='utf-8')
print(f'PASS: 100/100 final HTML questions/options/key; {dict(counts)}; max streak {streak}; PDFs {page_counts[0]}+{page_counts[1]} pages.')
