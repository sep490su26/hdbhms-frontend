function isBlockStart(line) {
  return /^(```|#{1,4}\s|[-*]\s|\d+[.)]\s|>\s?)/.test(line.trim());
}

function inlineParts(text, inverted = false) {
  const parts = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));

    const token = match[0];
    const key = `${match.index}-${token}`;
    if (token.startsWith("`")) {
      parts.push(
        <code
          key={key}
          className={`rounded px-1 py-0.5 text-[0.92em] font-bold ${inverted ? "bg-white/15" : "bg-slate-200"}`}
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      parts.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      parts.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else {
      const link = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
      parts.push(
        <a
          key={key}
          href={link[2]}
          target="_blank"
          rel="noreferrer"
          className="font-bold underline underline-offset-2"
        >
          {link[1]}
        </a>,
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function renderInline(text, key, inverted) {
  return <span key={key}>{inlineParts(text, inverted)}</span>;
}

export function MarkdownContent({ content, className = "", inverted = false }) {
  const lines = String(content || "").split(/\r?\n/);
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const code = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push(
        <pre key={`code-${index}`} className="overflow-x-auto rounded-lg bg-[#0f172a] p-3 text-xs leading-5 text-white">
          <code>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const Tag = heading[1].length <= 2 ? "h3" : "h4";
      blocks.push(
        <Tag key={`heading-${index}`} className="font-black leading-6 text-inherit">
          {inlineParts(heading[2], inverted)}
        </Tag>,
      );
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ul key={`ul-${index}`} className="list-disc space-y-1 pl-5">
          {items.map((item, itemIndex) => (
            <li key={`${itemIndex}-${item}`}>{inlineParts(item, inverted)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items = [];
      while (index < lines.length && /^\d+[.)]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+[.)]\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ol key={`ol-${index}`} className="list-decimal space-y-1 pl-5">
          {items.map((item, itemIndex) => (
            <li key={`${itemIndex}-${item}`}>{inlineParts(item, inverted)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quote = [];
      while (index < lines.length && lines[index].trim().startsWith(">")) {
        quote.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push(
        <blockquote key={`quote-${index}`} className="border-l-4 border-[#cbd5e1] pl-3 font-semibold opacity-85">
          {quote.map((item, itemIndex) => renderInline(item, itemIndex, inverted))}
        </blockquote>,
      );
      continue;
    }

    const paragraph = [trimmed];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index])) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push(
      <p key={`p-${index}`} className="m-0">
        {inlineParts(paragraph.join(" "), inverted)}
      </p>,
    );
  }

  return <div className={`space-y-2 break-words ${className}`}>{blocks}</div>;
}
