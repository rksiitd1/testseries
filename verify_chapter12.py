import json
import re
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path

stem = "2026-10-26-Hindi-Class-10th-Chapter-12"
record = json.loads(Path(stem + "-record.json").read_text(encoding="utf-8"))
paper_path = Path(stem + "-question-paper.html")
key_path = Path(stem + "-AnswerKey-16-Up-Duplex.html")
paper = paper_path.read_text(encoding="utf-8")
key = key_path.read_text(encoding="utf-8")
template_text=Path(r"C:\Users\RATNESH\.codex\plugins\cache\created-by-me-remote\bseb-paper-studio\1.0.12\skills\board-paper-generator\references\templates.md").read_text(encoding="utf-8")
paper_template=re.search(r"## Template 1: Three-column question paper\s+```html\s+(.*?)\s+```",template_text,re.S).group(1)
key_template=re.search(r"## Template 2: 16-up duplex answer key\s+```html\s+(.*?)\s+```",template_text,re.S).group(1)

class QParser(HTMLParser):
    def __init__(self):
        super().__init__(); self.qs=[]; self.cur=None; self.mode=None
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=="div" and a.get("class","").split()[0:1]==["q"]:
            self.cur={"text":"","options":[]}; self.qs.append(self.cur)
        elif self.cur is not None and tag=="span" and a.get("class")=="t": self.mode="text"
        elif self.cur is not None and tag=="div" and "o" in a.get("class","").split(): self.mode="options"
        elif self.cur is not None and tag=="div" and self.mode=="options": self.mode="option"
    def handle_endtag(self, tag):
        if self.cur is not None and tag=="div" and self.mode=="option": self.mode="options"
        elif tag=="div" and self.cur is not None and self.mode=="options": self.mode=None
        elif tag=="div" and self.cur is not None and self.mode is None: self.cur=None
        elif tag=="span" and self.mode=="text": self.mode=None
    def handle_data(self, data):
        if self.cur is None: return
        if self.mode=="text": self.cur["text"]+=data
        elif self.mode=="option": self.cur["options"].append(data)

parser=QParser(); parser.feed(paper)
questions=parser.qs
km=re.search(r"const KEY = \[(.*?)\];",key,re.S)
letters=re.findall(r"[\"']([ABCD])[\"']",km.group(1)) if km else []
errors=[]
comparison=[]
if len(questions)!=100: errors.append(f"paper question blocks={len(questions)}")
if len(record["questions"])!=100: errors.append(f"record questions={len(record['questions'])}")
if len(letters)!=100: errors.append(f"key entries={len(letters)}")
if Counter(letters)!=Counter({"A":25,"B":25,"C":25,"D":25}): errors.append(f"letter distribution={Counter(letters)}")
if any(letters[i]==letters[i+1]==letters[i+2] for i in range(max(0,len(letters)-2))): errors.append("three consecutive key letters")
if paper_path.stem!=re.search(r"<title>(.*?)</title>",paper,re.S).group(1): errors.append("paper title/stem mismatch")
if key_path.stem!=re.search(r"<title>(.*?)</title>",key,re.S).group(1): errors.append("key title/stem mismatch")
if re.search(r"<style>(.*?)</style>",paper,re.S).group(1)!=re.search(r"<style>(.*?)</style>",paper_template,re.S).group(1): errors.append("paper template CSS changed")
if re.search(r"<style>(.*?)</style>",key,re.S).group(1)!=re.search(r"<style>(.*?)</style>",key_template,re.S).group(1): errors.append("key template CSS changed")
marker="   DO NOT CHANGE BELOW THIS LINE"
if marker not in key or marker not in key_template or key.split(marker,1)[1]!=key_template.split(marker,1)[1]: errors.append("key fixed tail changed")
for i,(q,r,letter) in enumerate(zip(questions,record["questions"],letters),1):
    opts=[re.sub(r"^\([A-D]\)\s*","",x.strip()) for x in q["options"]]
    if len(opts)!=4 or len(set(opts))!=4: errors.append(f"Q{i}: not four distinct options")
    if r["number"]!=i or r["correctLetter"]!=letter: errors.append(f"Q{i}: record/key ordering")
    if opts["ABCD".index(letter)]!=r["answerText"]: errors.append(f"Q{i}: key does not point to correct answer text")
    if len(q["text"].strip())==0: errors.append(f"Q{i}: empty prompt")
    if r["source"]=="PYQ" and sorted(opts)!=sorted(r["originalOptions"]): errors.append(f"Q{i}: PYQ option text changed")
    parsed_text=re.sub(r"^\s*\d+\.\s*","",q["text"].strip())
    if r["source"]=="PYQ" and parsed_text!=r["question"]: errors.append(f"Q{i}: PYQ wording changed")
    comparison.append({"number":i,"correctOptionText":r["answerText"],"paperLetter":letter,"answerKeyLetter":letters[i-1],"status":"passed" if opts["ABCD".index(letter)]==r["answerText"] and r["correctLetter"]==letter else "failed"})
if "परीक्षा तिथि: 2026-10-26" not in paper or "अधिकतम समय: 60 मिनट" not in paper: errors.append("paper date/duration")
if 'const CLASS = "10";' not in key or 'const TEST_DATE = "2026-10-26";' not in key: errors.append("key date/class metadata")
if re.search(r"\[(?:QUESTION_TEXT|OPTION_[ABCD]|CHAPTER_NUMBER|CHAPTER_NAME|CLASS|TEST_DATE|MATCHING_PDF_STEM)\]",paper+key): errors.append("template placeholder")
if sum(x["source"]=="PYQ" for x in record["questions"])!=17: errors.append("PYQ count")
if sum(x["source"]=="generated" for x in record["questions"])!=83: errors.append("generated count")
print(json.dumps({"questionBlocks":len(questions),"keyEntries":len(letters),"pyq":sum(x["source"]=="PYQ" for x in record["questions"]),"generated":sum(x["source"]=="generated" for x in record["questions"]),"answerDistribution":dict(Counter(letters)),"errors":errors},ensure_ascii=False,indent=2))
if errors: raise SystemExit(1)
record["postGenerationAudit"]={"savedPaperFile":paper_path.name,"savedAnswerKeyFile":key_path.name,"questionCountCompared":100,"status":"passed","comparisonRows":comparison}
Path(stem+"-record.json").write_text(json.dumps(record,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
