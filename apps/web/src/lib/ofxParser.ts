export interface OFXTransaction {
  fitid: string;
  trntype: string;
  dtposted: string; // normalizado para "YYYY-MM-DD"
  trnamt: number;
  memo: string;
}

export interface OFXParseResult {
  transactions: OFXTransaction[];
  bankId?: string;
  acctId?: string;
  currency?: string;
}

/** Extrai o valor de uma tag OFX — suporta SGML e XML. */
function extractField(tag: string, block: string): string | undefined {
  // XML: <TAG>valor</TAG>
  const xmlMatch = block.match(new RegExp(`<${tag}>([^<]+)</${tag}>`, 'i'));
  if (xmlMatch) return xmlMatch[1].trim();
  // SGML: <TAG>valor\n  (sem fechamento)
  const sgmlMatch = block.match(new RegExp(`<${tag}>([^\n<]+)`, 'i'));
  return sgmlMatch?.[1].trim();
}

/**
 * Converte data OFX para ISO (YYYY-MM-DD).
 * Suporta: "20260115", "20260115120000", "20260115120000[-03:EST]"
 */
function parseOFXDate(raw: string): string {
  const digits = raw.replace(/\D/g, '').substring(0, 8);
  if (digits.length < 8) return raw;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

/** Divide o texto OFX em blocos individuais de <STMTTRN>. */
function splitIntoTransactionBlocks(body: string): string[] {
  const blocks: string[] = [];

  // Tenta XML primeiro: <STMTTRN>...</STMTTRN>
  const xmlRe = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match: RegExpExecArray | null;
  while ((match = xmlRe.exec(body)) !== null) {
    blocks.push(match[1]);
  }
  if (blocks.length > 0) return blocks;

  // Fallback SGML: delimita pelo próximo <STMTTRN> ou fim do BANKTRANLIST
  const parts = body.split(/<STMTTRN>/i);
  for (let i = 1; i < parts.length; i++) {
    // Remove possível </STMTTRN> ou tudo após </BANKTRANLIST>
    const raw = parts[i].split(/<\/STMTTRN>/i)[0].split(/<\/BANKTRANLIST>/i)[0];
    blocks.push(raw);
  }
  return blocks;
}

export function parseOFX(text: string): OFXParseResult {
  // Remove o cabeçalho OFX (linhas antes de <OFX>)
  const ofxStart = text.search(/<OFX>/i);
  const body = ofxStart >= 0 ? text.slice(ofxStart) : text;

  const bankId = extractField('BANKID', body);
  const acctId = extractField('ACCTID', body);
  const currency = extractField('CURDEF', body);

  const blocks = splitIntoTransactionBlocks(body);

  const transactions: OFXTransaction[] = blocks
    .map((block): OFXTransaction | null => {
      const fitid = extractField('FITID', block);
      const trntype = extractField('TRNTYPE', block) ?? 'OTHER';
      const dtposted = extractField('DTPOSTED', block);
      const trnamt = extractField('TRNAMT', block);
      const memo = extractField('MEMO', block) ?? extractField('NAME', block) ?? trntype;

      if (!fitid || !dtposted || trnamt === undefined) return null;

      return {
        fitid,
        trntype: trntype.toUpperCase(),
        dtposted: parseOFXDate(dtposted),
        trnamt: parseFloat(trnamt.replace(',', '.')),
        memo,
      };
    })
    .filter((t): t is OFXTransaction => t !== null);

  return { transactions, bankId, acctId, currency };
}
