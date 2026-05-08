import { marked } from 'marked';
import type { MarkdownDocument } from '@/lib/types';

export function parseMarkdown(content: string, filename: string): MarkdownDocument {
  const lines = content.split('\n');
  let frontMatter: Record<string, unknown> = {};
  let bodyStartIndex = 0;

  if (lines[0]?.trim() === '---') {
    const endIndex = lines.slice(1).findIndex((line) => line.trim() === '---');
    if (endIndex > 0) {
      const fmLines = lines.slice(1, endIndex + 1);
      for (const line of fmLines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.slice(0, colonIndex).trim();
          const value = line.slice(colonIndex + 1).trim();
          frontMatter[key] = value;
        }
      }
      bodyStartIndex = endIndex + 2;
    }
  }

  const bodyContent = lines.slice(bodyStartIndex).join('\n');

  const sections: { heading: string; content: string }[] = [];
  const headingRegex = /^##\s+(.+)$/gm;
  let lastIndex = 0;
  let match;

  while ((match = headingRegex.exec(bodyContent)) !== null) {
    if (lastIndex > 0) {
      const sectionContent = bodyContent.slice(lastIndex, match.index).trim();
      const prevHeading = bodyContent.slice(bodyContent.lastIndexOf('##', match.index - 1), match.index);
      sections.push({ heading: match[1], content: sectionContent });
    } else {
      sections.push({ heading: match[1], content: bodyContent.slice(0, match.index).trim() });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < bodyContent.length) {
    sections.push({ heading: '附录', content: bodyContent.slice(lastIndex).trim() });
  }

  return {
    title: frontMatter.title as string || filename.replace(/\.md$/, ''),
    content: bodyContent,
    frontMatter,
    sections: sections.length > 0 ? sections : [{ heading: '正文', content: bodyContent }],
  };
}
