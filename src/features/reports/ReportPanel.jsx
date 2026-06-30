import { BookOpen, Sparkles } from 'lucide-react';
import { wordCount } from '../../shared/dashboardModel.js';

export default function ReportPanel({ learner, report, loading, onGenerateReport }) {
  return (
    <section className="panel report-panel">
      <div className="panel-header">
        <div><p className="eyebrow">Report draft</p><h2>Generate from observations</h2></div>
        <button className="primary-button" onClick={onGenerateReport} disabled={loading || !learner}><Sparkles size={16} /> Generate</button>
      </div>
      {!report ? <div className="report-placeholder"><BookOpen size={32} /><p>Generate a draft to see how stored notes become report-ready language.</p></div> : <div className="draft-output"><h3>{report.learnerName}</h3>{report.sections.map((section) => <article key={section.sectionName} className="draft-section"><h4>{section.sectionName}</h4><p>{section.text}</p><small>{wordCount(section.text)} words</small></article>)}{report.questions.length > 0 && <div className="teacher-prompts"><h4>Personal touch prompts</h4>{report.questions.map((question) => <p key={question}>{question}</p>)}</div>}</div>}
    </section>
  );
}
