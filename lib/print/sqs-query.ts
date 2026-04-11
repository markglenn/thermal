/**
 * Lightweight SQS client using the legacy query/XML protocol.
 *
 * AWS SDK v3 uses the JSON protocol which goaws doesn't support.
 * This module provides SendMessage, ReceiveMessage, and DeleteMessage
 * using raw HTTP form posts for local dev with goaws.
 */

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'");
}

function parseXmlTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}>([^<]*)</${tag}>`);
  const match = xml.match(re);
  return match ? decodeXmlEntities(match[1]) : null;
}

async function sqsPost(url: string, params: Record<string, string>): Promise<string> {
  const body = new URLSearchParams(params).toString();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`SQS ${params.Action} failed: ${res.status} ${text.substring(0, 200)}`);
  return text;
}

export async function sendMessage(queueUrl: string, messageBody: string): Promise<string | null> {
  const xml = await sqsPost(queueUrl, { Action: 'SendMessage', MessageBody: messageBody });
  return parseXmlTag(xml, 'MessageId');
}

export interface ReceivedMessage {
  messageId: string;
  receiptHandle: string;
  body: string;
}

export async function receiveMessages(queueUrl: string, maxMessages = 10, waitTimeSeconds = 1): Promise<ReceivedMessage[]> {
  const xml = await sqsPost(queueUrl, {
    Action: 'ReceiveMessage',
    MaxNumberOfMessages: String(maxMessages),
    WaitTimeSeconds: String(waitTimeSeconds),
  });

  const messages: ReceivedMessage[] = [];
  const messageRegex = /<Message>([\s\S]*?)<\/Message>/g;
  let match;
  while ((match = messageRegex.exec(xml)) !== null) {
    const block = match[1];
    const messageId = parseXmlTag(block, 'MessageId');
    const receiptHandle = parseXmlTag(block, 'ReceiptHandle');
    const body = parseXmlTag(block, 'Body');
    if (messageId && receiptHandle && body) {
      messages.push({ messageId, receiptHandle, body });
    }
  }
  return messages;
}

export async function deleteMessage(queueUrl: string, receiptHandle: string): Promise<void> {
  await sqsPost(queueUrl, { Action: 'DeleteMessage', ReceiptHandle: receiptHandle });
}
