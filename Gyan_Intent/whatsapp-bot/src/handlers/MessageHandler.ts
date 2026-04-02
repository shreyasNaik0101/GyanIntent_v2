/**
 * MessageHandler
 * Receives and processes incoming WhatsApp messages
 */

import { Message, Chat } from 'whatsapp-web.js';
import { MessageData, MediaType, Language } from '../types';
import { MessageRouter } from './MessageRouter';
import { MediaHandler } from './MediaHandler';
import { ContentGenerator } from '../services/ContentGenerator';
import { ResponseFormatter } from '../services/ResponseFormatter';
import { SessionStore } from '../storage/SessionStore';
import { logger } from '../utils/logger';
import { trackMessageProcessing } from '../utils/metrics';

export class MessageHandler {
  private router: MessageRouter;
  private mediaHandler: MediaHandler;
  private contentGenerator: ContentGenerator;
  private responseFormatter: ResponseFormatter;
  private sessionStore: SessionStore;
  private processedMessages = new Set<string>();

  constructor(
    router: MessageRouter,
    mediaHandler: MediaHandler,
    contentGenerator: ContentGenerator,
    responseFormatter: ResponseFormatter,
    sessionStore: SessionStore
  ) {
    this.router = router;
    this.mediaHandler = mediaHandler;
    this.contentGenerator = contentGenerator;
    this.responseFormatter = responseFormatter;
    this.sessionStore = sessionStore;
  }

  async handleMessage(message: Message): Promise<void> {
    await trackMessageProcessing(async () => {
      // Deduplicate — whatsapp-web.js can fire 'message' twice for the same msg
      const msgId = message.id?._serialized;
      if (msgId) {
        if (this.processedMessages.has(msgId)) return;
        this.processedMessages.add(msgId);
        // Evict oldest entries to prevent memory leak
        if (this.processedMessages.size > 5000) {
          const first = this.processedMessages.values().next().value;
          if (first) this.processedMessages.delete(first);
        }
      }

      // Validate message first
      if (!this.validateMessage(message)) {
        return;
      }

      const messageData = this.extractMessageData(message);
      logger.info('Processing message', {
        from: messageData.from,
        hasMedia: messageData.hasMedia,
        bodyLength: messageData.body.length,
      });

      // Acknowledge the message
      await this.acknowledgeMessage(message);

      // Get or create user session
      const session = await this.sessionStore.getOrCreateSession(
        messageData.from,
        messageData.fromName
      );

      // Add user message to conversation history
      await this.sessionStore.addMessageToHistory(
        messageData.from,
        'user',
        messageData.body
      );

      // Language selection: intercept 1/2/3/4 at ANY point in the conversation
      const langPick = this.parseLanguageChoice(messageData.body);
      if (langPick) {
        const isSwitch = session.languageSet && session.language !== langPick;
        session.language = langPick;
        session.languageSet = true;
        await this.sessionStore.updateSession(session);
        const confirmations: Record<Language, string> = {
          [Language.ENGLISH]: isSwitch
            ? '🔄 Switched to *English*! Your conversation context is saved. Ask away! 📚'
            : '✅ Language set to *English*!\n\nAsk me anything — I\'m here to help you learn! 📚',
          [Language.HINGLISH]: isSwitch
            ? '🔄 *Hinglish* mein switch ho gaya! Context yaad hai. Poocho kuch! 📚'
            : '✅ Language set to *Hinglish*!\n\nKuch bhi poocho — main help karne ke liye ready hoon! 📚',
          [Language.HINDI]: isSwitch
            ? '🔄 *हिन्दी* में बदल दिया! पिछली बातचीत याद है। पूछो! 📚'
            : '✅ भाषा *हिन्दी* में सेट हो गई!\n\nकुछ भी पूछो — मैं मदद के लिए तैयार हूँ! 📚',
          [Language.KANNADA]: isSwitch
            ? '🔄 *ಕನ್ನಡ*ಕ್ಕೆ ಬದಲಾಯಿಸಲಾಗಿದೆ! ಸಂದರ್ಭ ಉಳಿದಿದೆ. ಕೇಳಿ! 📚'
            : '✅ ಭಾಷೆ *ಕನ್ನಡ* ಎಂದು ಹೊಂದಿಸಲಾಗಿದೆ!\n\nಏನಾದರೂ ಕೇಳಿ — ನಾನು ಸಹಾಯ ಮಾಡಲು ಸಿದ್ಧ! 📚',
        };
        await message.reply(confirmations[langPick]);
        return;
      }

      // If language not yet set, show the menu
      if (!session.languageSet) {
        await message.reply(this.getLanguageMenu());
        return;
      }

      // Handle greetings locally — no need to call the LLM
      if (this.isGreeting(messageData.body)) {
        const name = session.userName || messageData.fromName || '';
        const greeting = this.localizedMsg(session.language, {
          english: `👋 Hey${name ? ' ' + name : ''}! Welcome to *Gyan_Intent Bot* 🎓\n\nI can help you with:\n📚 *Ask a question* — Type any doubt\n📐 *Math problems* — Send a problem to solve\n🖼️ *Image solving* — Send a photo of a question\n🎬 *Video* — Type "video [topic]"\n\n🌐 Switch language anytime: send *1/2/3/4*\n\nWhat would you like to learn today?`,
          hinglish: `👋 Hey${name ? ' ' + name : ''}! *Gyan_Intent Bot* mein aapka swagat hai 🎓\n\nMain aapki help kar sakta hoon:\n📚 *Sawaal poocho* — Koi bhi doubt likho\n📐 *Math problems* — Problem bhejo, solve karunga\n🖼️ *Image se solve* — Question ki photo bhejo\n🎬 *Video* — "video [topic]" likho\n\n🌐 Language change karo kabhi bhi: *1/2/3/4* bhejo\n\nAaj kya seekhna hai?`,
          hindi: `👋 नमस्ते${name ? ' ' + name : ''}! *Gyan_Intent Bot* में आपका स्वागत है 🎓\n\nमैं आपकी मदद कर सकता हूँ:\n📚 *सवाल पूछें* — कोई भी doubt लिखें\n📐 *गणित* — Problem भेजें, हल करूँगा\n🖼️ *फोटो से हल* — Question की photo भेजें\n🎬 *वीडियो* — "video [विषय]" लिखें\n\n🌐 भाषा बदलें कभी भी: *1/2/3/4* भेजें\n\nआज क्या सीखना है?`,
          kannada: `👋 ನಮಸ್ಕಾರ${name ? ' ' + name : ''}! *Gyan_Intent Bot* ಗೆ ಸುಸ್ವಾಗತ 🎓\n\nನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ:\n📚 *ಪ್ರಶ್ನೆ ಕೇಳಿ* — ಯಾವುದೇ doubt ಬರೆಯಿರಿ\n📐 *ಗಣಿತ* — Problem ಕಳುಹಿಸಿ\n🖼️ *ಫೋಟೋದಿಂದ ಪರಿಹಾರ* — Question ನ photo ಕಳುಹಿಸಿ\n🎬 *ವೀಡಿಯೊ* — "video [ವಿಷಯ]" ಬರೆಯಿರಿ\n\n🌐 ಭಾಷೆ ಬದಲಿಸಿ: *1/2/3/4* ಕಳುಹಿಸಿ\n\nಇಂದು ಏನು ಕಲಿಯಬೇಕು?`,
        });
        await message.reply(greeting);
        await this.sessionStore.addMessageToHistory(messageData.from, 'assistant', greeting);
        return;
      }

      // Handle image messages — download and solve via vision
      if (message.hasMedia && (messageData.mediaType === MediaType.IMAGE)) {
        try {
          const imgAck = this.localizedMsg(session.language, {
            english: '🔍 Image received! Analyzing...',
            hinglish: '🔍 Image receive ho gayi! Analyzing...',
            hindi: '🔍 छवि मिल गई! विश्लेषण हो रहा है...',
            kannada: '🔍 ಚಿತ್ರ ಸ್ವೀಕರಿಸಲಾಗಿದೆ! ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...',
          });
          await message.reply(imgAck);
          const media = await message.downloadMedia();
          if (media && media.data) {
            const responseText = await this.contentGenerator.solveImage(
              media.data,
              messageData.body || '',
              session
            );
            for (const chunk of this.responseFormatter.formatText(responseText)) {
              await message.reply(chunk);
            }
            await this.sessionStore.addMessageToHistory(
              messageData.from,
              'assistant',
              responseText
            );
          } else {
            await message.reply(this.localizedMsg(session.language, {
              english: '⚠️ Could not download the image. Please send again!',
              hinglish: '⚠️ Image download nahi ho payi. Please dobara bhejo!',
              hindi: '⚠️ छवि डाउनलोड नहीं हो पाई। कृपया दोबारा भेजें!',
              kannada: '⚠️ ಚಿತ್ರ ಡೌನ್‌ಲೋಡ್ ಆಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಕಳುಹಿಸಿ!',
            }));
          }
        } catch (err: any) {
          logger.error('Image processing failed', { error: err.message });
          await message.reply(this.localizedMsg(session.language, {
            english: '⚠️ Could not process the image. Please try again!',
            hinglish: '⚠️ Image process nahi ho payi. Please try again!',
            hindi: '⚠️ छवि प्रोसेस नहीं हो पाई। कृपया फिर कोशिश करें!',
            kannada: '⚠️ ಚಿತ್ರ ಪ್ರಕ್ರಿಯೆ ಆಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ!',
          }));
        }
        return;
      }

      // Handle document (PDF) messages — extract topics & generate videos one by one
      if (message.hasMedia && messageData.mediaType === MediaType.DOCUMENT) {
        try {
          const media = await message.downloadMedia();
          if (media && media.data && media.mimetype === 'application/pdf') {
            await message.reply(this.localizedMsg(session.language, {
              english: '📄 PDF received! Checking cache for videos...',
              hinglish: '📄 PDF mil gayi! Cache mein videos dekh raha hoon...',
              hindi: '📄 PDF मिल गई! कैश में वीडियो देख रहा हूँ...',
              kannada: '📄 PDF ಸ್ವೀಕರಿಸಲಾಗಿದೆ! ಕ್ಯಾಶ್‌ನಲ್ಲಿ ವೀಡಿಯೊ ನೋಡುತ್ತಿದ್ದೇನೆ...',
            }));

            const pdfBuffer = Buffer.from(media.data, 'base64');
            const { paperTitle, topics, allCached } = await this.contentGenerator.generateVideosFromPDF(
              pdfBuffer, session
            );

            if (allCached) {
              await message.reply(this.localizedMsg(session.language, {
                english: `📚 *${paperTitle}*\n\n✅ All ${topics.length} videos found in cache! Sending one by one...`,
                hinglish: `📚 *${paperTitle}*\n\n✅ Saare ${topics.length} videos cache mein hain! Ek-ek karke bhej raha hoon...`,
                hindi: `📚 *${paperTitle}*\n\n✅ सभी ${topics.length} वीडियो कैश में मिले! एक-एक करके भेज रहा हूँ...`,
                kannada: `📚 *${paperTitle}*\n\n✅ ಎಲ್ಲಾ ${topics.length} ವೀಡಿಯೊಗಳು ಕ್ಯಾಶ್‌ನಲ್ಲಿವೆ! ಒಂದೊಂದಾಗಿ ಕಳುಹಿಸುತ್ತಿದ್ದೇನೆ...`,
              }));
            } else {
              await message.reply(this.localizedMsg(session.language, {
                english: `📚 *${paperTitle}*\n\nFound ${topics.length} topics. Generating videos...`,
                hinglish: `📚 *${paperTitle}*\n\n${topics.length} topics mile. Videos bana raha hoon...`,
                hindi: `📚 *${paperTitle}*\n\n${topics.length} विषय मिले। वीडियो बना रहा हूँ...`,
                kannada: `📚 *${paperTitle}*\n\n${topics.length} ವಿಷಯಗಳು ಸಿಕ್ಕವು. ವೀಡಿಯೊ ಮಾಡುತ್ತಿದ್ದೇನೆ...`,
              }));
            }

            // Send each topic video one by one
            for (const topic of topics) {
              if (topic.status === 'completed' && topic.video_url) {
                // Cached — send immediately
                await this.mediaHandler.sendVideo(
                  messageData.from,
                  topic.video_url,
                  this.localizedMsg(session.language, {
                    english: `🎬 *${topic.title}* (${topic.index}/${topics.length})`,
                    hinglish: `🎬 *${topic.title}* (${topic.index}/${topics.length})`,
                    hindi: `🎬 *${topic.title}* (${topic.index}/${topics.length})`,
                    kannada: `🎬 *${topic.title}* (${topic.index}/${topics.length})`,
                  })
                );
              } else {
                // Being generated — poll until ready
                const result = await this.contentGenerator.pollVideoStatus(topic.job_id);
                if (result.success && result.videoUrl) {
                  await this.mediaHandler.sendVideo(
                    messageData.from,
                    result.videoUrl,
                    this.localizedMsg(session.language, {
                      english: `🎬 *${topic.title}* (${topic.index}/${topics.length})`,
                      hinglish: `🎬 *${topic.title}* (${topic.index}/${topics.length})`,
                      hindi: `🎬 *${topic.title}* (${topic.index}/${topics.length})`,
                      kannada: `🎬 *${topic.title}* (${topic.index}/${topics.length})`,
                    })
                  );
                } else {
                  await this.mediaHandler.sendText(
                    messageData.from,
                    `⚠️ Video ${topic.index}/${topics.length} (${topic.title}) failed: ${result.errorMessage}`
                  );
                }
              }
            }

            await message.reply(this.localizedMsg(session.language, {
              english: `✅ All ${topics.length} videos from *${paperTitle}* sent! Videos are cached for instant replay.`,
              hinglish: `✅ *${paperTitle}* ke saare ${topics.length} videos bhej diye! Cache ho gaye hain.`,
              hindi: `✅ *${paperTitle}* के सभी ${topics.length} वीडियो भेज दिए! कैश हो गए हैं।`,
              kannada: `✅ *${paperTitle}* ನ ಎಲ್ಲಾ ${topics.length} ವೀಡಿಯೊಗಳನ್ನು ಕಳುಹಿಸಲಾಗಿದೆ! ಕ್ಯಾಶ್ ಆಗಿವೆ.`,
            }));
          } else {
            await message.reply(this.localizedMsg(session.language, {
              english: '📄 Please send a PDF file. Other document types are not supported yet.',
              hinglish: '📄 PDF file bhejo. Abhi dusre document types support nahi hai.',
              hindi: '📄 कृपया PDF भेजें। अन्य दस्तावेज़ प्रकार अभी समर्थित नहीं हैं।',
              kannada: '📄 ದಯವಿಟ್ಟು PDF ಕಳುಹಿಸಿ. ಇತರ ದಾಖಲೆ ಪ್ರಕಾರಗಳು ಬೆಂಬಲಿತವಾಗಿಲ್ಲ.',
            }));
          }
        } catch (err: any) {
          logger.error('PDF processing failed', { error: err.message });
          await message.reply(this.localizedMsg(session.language, {
            english: '⚠️ Could not process the PDF. Please try again!',
            hinglish: '⚠️ PDF process nahi ho payi. Please try again!',
            hindi: '⚠️ PDF प्रोसेस नहीं हो पाई। कृपया फिर कोशिश करें!',
            kannada: '⚠️ PDF ಪ್ರಕ್ರಿಯೆ ಆಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ!',
          }));
        }
        return;
      }

      // Route the message
      const routeDecision = await this.router.route(messageData);
      logger.info('Message routed', {
        handler: routeDecision.handler,
        intent: routeDecision.intent,
        confidence: routeDecision.confidence,
      });

      // Keep a lightweight context topic for follow-ups like: "what is X" -> "video"
      if (
        routeDecision.intent !== 'video_generation' &&
        routeDecision.intent !== 'command' &&
        messageData.body &&
        messageData.body.trim().length >= 4
      ) {
        try {
          await this.sessionStore.updateContext(messageData.from, messageData.body.trim());
        } catch (error) {
          logger.debug('Could not update session context', { error, from: messageData.from });
        }
      }

      // Handle based on intent
      let responseText: string;
      try {
        switch (routeDecision.intent) {
          case 'video_generation': {
            const requestedTopic = routeDecision.parameters.topic || '';
            const topic = this.resolveVideoTopic(requestedTopic, session, messageData.body);

            if (!topic) {
              responseText = this.localizedMsg(session.language, {
                english: '🎬 Tell me the topic for the video. Example: *video euclid theorem*',
                hinglish: '🎬 Video ka topic batao. Example: *video euclid theorem*',
                hindi: '🎬 वीडियो का विषय बताइए। उदाहरण: *video euclid theorem*',
                kannada: '🎬 ವೀಡಿಯೊ ವಿಷಯವನ್ನು ತಿಳಿಸಿ. ಉದಾಹರಣೆ: *video euclid theorem*',
              });
              await message.reply(responseText);
              break;
            }

            // Check if a prebuilt video exists for this topic (instant delivery)
            const builtin = this.contentGenerator.findBuiltinVideo(topic);
            if (builtin) {
              responseText = this.localizedMsg(session.language, {
                english: `🎬 *${builtin.label}* — Sending video now!`,
                hinglish: `🎬 *${builtin.label}* — Video bhej raha hoon!`,
                hindi: `🎬 *${builtin.label}* — वीडियो भेज रहा हूँ!`,
                kannada: `🎬 *${builtin.label}* — ವೀಡಿಯೊ ಕಳುಹಿಸುತ್ತಿದ್ದೇನೆ!`,
              });
              await message.reply(responseText);
              try {
                await this.mediaHandler.sendLocalVideo(
                  messageData.from,
                  builtin.filePath,
                  this.localizedMsg(session.language, {
                    english: `🎬 *${builtin.label}*\n\nHere's your video! Have more questions? Just ask! 📚`,
                    hinglish: `🎬 *${builtin.label}*\n\nYe lo video! Aur kuch puchna hai? Bus likh do! 📚`,
                    hindi: `🎬 *${builtin.label}*\n\nयह रहा वीडियो! और कुछ पूछना है? बस लिख दो! 📚`,
                    kannada: `🎬 *${builtin.label}*\n\nಇಲ್ಲಿದೆ ನಿಮ್ಮ ವೀಡಿಯೊ! ಇನ್ನೂ ಪ್ರಶ್ನೆಗಳಿವೆಯೇ? ಕೇಳಿ! 📚`,
                  })
                );
              } catch (err) {
                logger.error('Failed to send builtin video', { error: err, topic });
                await message.reply(this.localizedMsg(session.language, {
                  english: '⚠️ Could not send the video. Please try again!',
                  hinglish: '⚠️ Video bhej nahi paaya. Please try again!',
                  hindi: '⚠️ वीडियो नहीं भेज पाया। कृपया फिर कोशिश करें!',
                  kannada: '⚠️ ವೀಡಿಯೊ ಕಳುಹಿಸಲು ಆಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ!',
                }));
              }
              break;
            }

            // No builtin — generate via backend API
            responseText = this.localizedMsg(session.language, {
              english: `🎬 Starting video generation!\n\nTopic: ${topic}\n\n⏱️ Usually ready in about 2 minutes. Cached topics send instantly.`,
              hinglish: `🎬 Video generation shuru ho rahi hai!\n\nTopic: ${topic}\n\n⏱️ Usually lagbhag 2 minute lagte hain. Cached topic turant bhej deta hoon.`,
              hindi: `🎬 वीडियो बनाना शुरू हो रहा है!\n\nविषय: ${topic}\n\n⏱️ आमतौर पर लगभग 2 मिनट लगते हैं। कैश्ड विषय तुरंत भेज दिए जाते हैं।`,
              kannada: `🎬 ವೀಡಿಯೊ ರಚನೆ ಪ್ರಾರಂಭವಾಗುತ್ತಿದೆ!\n\nವಿಷಯ: ${topic}\n\n⏱️ ಸಾಮಾನ್ಯವಾಗಿ ಸುಮಾರು 2 ನಿಮಿಷ ಬೇಕಾಗುತ್ತದೆ. ಕ್ಯಾಶ್ ಆದ ವಿಷಯಗಳು ತಕ್ಷಣ ಕಳುಹಿಸಲಾಗುತ್ತವೆ.`,
            });
            await message.reply(responseText);

            void this.handleVideoGenerationAsync(messageData.from, topic, session);
            break;
          }

          case 'concept_explanation':
            responseText = await this.contentGenerator.explainConcept(messageData.body, session);
            for (const chunk of this.responseFormatter.formatText(responseText)) {
              await message.reply(chunk);
            }
            break;

          case 'math_problem':
            responseText = await this.contentGenerator.solveMathProblem(messageData.body, session);
            for (const chunk of this.responseFormatter.formatText(responseText)) {
              await message.reply(chunk);
            }
            break;

          case 'question_answer':
            responseText = await this.contentGenerator.answerQuestion(messageData.body, session);
            for (const chunk of this.responseFormatter.formatText(responseText)) {
              await message.reply(chunk);
            }
            break;

          case 'command': {
            const cmd = messageData.body.toLowerCase().replace('!', '').trim();
            if (cmd === 'language') {
              // Reset language so user gets the menu again
              session.languageSet = false;
              await this.sessionStore.updateSession(session);
            }
            responseText = this.handleCommand(messageData.body);
            await message.reply(responseText);
            break;
          }

          default:
            responseText = await this.contentGenerator.answerQuestion(messageData.body, session);
            for (const chunk of this.responseFormatter.formatText(responseText)) {
              await message.reply(chunk);
            }
            break;
        }
      } catch (error) {
        logger.error('Error processing message', { error, from: messageData.from });
        await message.reply(this.localizedMsg(session.language, {
          english: '😔 Something went wrong! Please try again.\n\nCommands:\n• *!help* — Help\n• *video [topic]* — Generate video',
          hinglish: '😔 Kuch galat ho gaya! Please dobara try karo.\n\nCommands:\n• *!help* — Madad\n• *video [topic]* — Video banao',
          hindi: '😔 कुछ गलत हो गया! कृपया दोबारा कोशिश करें।\n\nCommands:\n• *!help* — मदद\n• *video [topic]* — वीडियो बनाओ',
          kannada: '😔 ಏನೋ ತಪ್ಪಾಗಿದೆ! ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.\n\nCommands:\n• *!help* — ಸಹಾಯ\n• *video [topic]* — ವೀಡಿಯೊ ಮಾಡಿ',
        }));
      }

      // Add bot response to history
      await this.sessionStore.addMessageToHistory(
        messageData.from,
        'assistant',
        responseText! || 'Error response sent'
      );
    }, { handler: 'message_handler' });
  }

  extractMessageData(message: Message): MessageData {
    // using (message as any)._data to get underlying contact info without ts errors
    const contact = (message as any)._data;
    let mediaType: MediaType | undefined;

    if (message.hasMedia) {
      const type = message.type;
      if (type === 'image' || type === 'sticker') mediaType = MediaType.IMAGE;
      else if (type === 'video' || type === 'ptt') mediaType = MediaType.VIDEO;
      else if (type === 'document') mediaType = MediaType.DOCUMENT;
      else if (type === 'audio') mediaType = MediaType.AUDIO;
    }

    return {
      id: message.id._serialized,
      from: message.from,
      fromName: (contact as any)?.notifyName || 'Unknown',
      body: message.body || '',
      timestamp: message.timestamp,
      hasMedia: message.hasMedia,
      mediaType,
      isGroup: message.from.endsWith('@g.us'),
      groupId: message.from.endsWith('@g.us') ? message.from : undefined,
      mentionedIds: [],
    };
  }

  async downloadMedia(message: Message): Promise<Buffer> {
    const media = await message.downloadMedia();
    if (!media) {
      throw new Error('Failed to download media');
    }
    return Buffer.from(media.data, 'base64');
  }

  validateMessage(message: Message): boolean {
    // Reject status broadcasts
    if (message.from === 'status@broadcast') return false;

    // Allow self-sent messages for testing (message yourself to test the bot)
    // if (message.fromMe) return false;

    // Reject empty messages without media
    if (!message.body && !message.hasMedia) return false;

    return true;
  }

  async acknowledgeMessage(message: Message): Promise<void> {
    try {
      const chat: Chat = await message.getChat();
      await chat.sendSeen();
    } catch (error) {
      logger.debug('Could not send seen receipt', { error });
    }
  }

  private handleCommand(text: string): string {
    const command = text.toLowerCase().replace('!', '').trim();

    switch (command) {
      case 'help':
      case 'madad':
        return `🙏 *Gyan_Intent Bot*\n\nMain kya kar sakti hoon:\n\n📚 *Concept explain* — Koi bhi topic likh ke bhejo\n🎬 *Video generate* — "video [topic]" likh ke bhejo\n📐 *Math solve* — Math problem likh ke bhejo\n🔬 *Science doubts* — Science question likh ke bhejo\n\n*Commands:*\n• !help — Yeh message\n• !status — Bot status\n• !language — Language change karo`;

      case 'status':
        return `✅ *Bot Status*\n\n🟢 Online\n📊 Processing messages normally`;

      case 'language':
        return this.getLanguageMenu();

      default:
        return `❓ Unknown command: !${command}\n\nType *!help* for available commands.`;
    }
  }

  private getLanguageMenu(): string {
    return (
      `🌐 *Welcome to Gyan_Intent Bot!* 🎓\n\n` +
      `Please choose your language / अपनी भाषा चुनें:\n\n` +
      `1️⃣  *English*\n` +
      `2️⃣  *Hinglish* (Hindi + English)\n` +
      `3️⃣  *हिन्दी* (Hindi)\n` +
      `4️⃣  *ಕನ್ನಡ* (Kannada)\n\n` +
      `Reply with *1*, *2*, *3*, or *4*`
    );
  }

  private parseLanguageChoice(text: string): Language | null {
    const t = text.trim().toLowerCase();
    if (t === '1' || t === 'english') return Language.ENGLISH;
    if (t === '2' || t === 'hinglish') return Language.HINGLISH;
    if (t === '3' || t === 'hindi' || t === 'हिन्दी' || t === 'हिंदी') return Language.HINDI;
    if (t === '4' || t === 'kannada' || t === 'ಕನ್ನಡ') return Language.KANNADA;
    return null;
  }

  private localizedMsg(
    lang: Language,
    msgs: { english: string; hinglish: string; hindi: string; kannada: string }
  ): string {
    switch (lang) {
      case Language.ENGLISH: return msgs.english;
      case Language.HINDI: return msgs.hindi;
      case Language.KANNADA: return msgs.kannada;
      case Language.HINGLISH:
      default:
        return msgs.hinglish;
    }
  }

  private isGreeting(text: string): boolean {
    const t = text.trim().toLowerCase();
    const greetings = [
      'hi', 'hello', 'hey', 'hola', 'yo', 'sup',
      'high',
      'namaste', 'namaskar', 'hii', 'hiii', 'hiiii',
      'good morning', 'good afternoon', 'good evening',
      'gm', 'gn', 'howdy', 'whats up', "what's up",
      'helo', 'helloo', 'hellooo',
      'नमस्ते', 'नमस्कार', 'ನಮಸ್ಕಾರ',
    ];
    return greetings.includes(t) || /^h+e+l+o+$/i.test(t) || /^h+i+$/i.test(t);
  }

  private resolveVideoTopic(requestedTopic: string, session: any, rawMessage: string): string | null {
    const cleanedRequested = (requestedTopic || '').trim();
    if (cleanedRequested && !this.isGenericVideoPrompt(cleanedRequested)) {
      return cleanedRequested;
    }

    const raw = (rawMessage || '').trim();
    if (raw && this.containsVideoKeyword(raw) && !this.isGenericVideoPrompt(raw)) {
      return null;
    }

    const contextTopic = (session.currentContext || '').trim();
    if (contextTopic && !this.isGenericVideoPrompt(contextTopic)) {
      return contextTopic;
    }

    const history = Array.isArray(session.conversationHistory)
      ? session.conversationHistory
      : [];

    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i];
      if (!msg || msg.role !== 'user') continue;
      const text = (msg.content || '').trim();
      if (!text) continue;
      if (text.startsWith('!')) continue;
      if (this.parseLanguageChoice(text)) continue;
      if (this.isGenericVideoPrompt(text)) continue;
      if (text.length < 4) continue;
      return text;
    }

    return null;
  }

  private isGenericVideoPrompt(text: string): boolean {
    const normalized = text.toLowerCase().trim();
    const generic = [
      'video',
      'make video',
      'generate video',
      'video banao',
      'banao video',
      'animation',
      // Hindi
      'वीडियो',
      'वीडियो बनाओ',
      'विडियो',
      'वीडियो दिखाओ',
      // Kannada
      'ವೀಡಿಯೊ',
      'ವೀಡಿಯೊ ಮಾಡಿ',
      'ವಿಡಿಯೋ',
      'ವೀಡಿಯೊ ತೋರಿಸಿ',
    ];
    return generic.includes(normalized);
  }

  private containsVideoKeyword(text: string): boolean {
    const normalized = text.toLowerCase();
    const keywords = [
      'video', 'generate', 'banao', 'bana do', 'animation',
      'वीडियो', 'विडियो',
      'ವೀಡಿಯೊ', 'ವಿಡಿಯೋ',
    ];
    return keywords.some((keyword) => normalized.includes(keyword));
  }

  private async handleVideoGenerationAsync(to: string, topic: string, session: any): Promise<void> {
    try {
      const videoResult = await this.contentGenerator.generateVideo(topic, session);
      if (videoResult.success && videoResult.videoUrl) {
        await this.mediaHandler.sendVideo(
          to,
          videoResult.videoUrl,
          this.localizedMsg(session.language, {
            english: `🎬 ${topic} — Your video is ready!`,
            hinglish: `🎬 ${topic} — Aapka video ready hai!`,
            hindi: `🎬 ${topic} — आपका वीडियो तैयार है!`,
            kannada: `🎬 ${topic} — ನಿಮ್ಮ ವೀಡಿಯೊ ಸಿದ್ಧವಾಗಿದೆ!`,
          })
        );

        return;
      }

      await this.sendVideoFailureMessage(to, session, videoResult.errorMessage || 'Video generation failed');
    } catch (err: any) {
      logger.error('Async video generation failed', { error: err?.message, to, topic });
      await this.sendVideoFailureMessage(
        to,
        session,
        err?.message || 'Video generation failed'
      );
    }
  }

  private async sendVideoFailureMessage(to: string, session: any, errorMessage: string): Promise<void> {
    const formatted = this.responseFormatter.formatError(new Error(errorMessage));
    const timeoutLike = /timeout/i.test(errorMessage);

    const localized = timeoutLike
      ? this.localizedMsg(session.language, {
          english: '⏱️ Video is taking longer than usual, but generation is still running. Please try the same topic again after a few minutes if it has not arrived yet.',
          hinglish: '⏱️ Video ko expected se zyada time lag raha hai, lekin generation abhi chal rahi hai. Agar kuch minute mein video na aaye to same topic dobara bhejo.',
          hindi: '⏱️ वीडियो बनने में सामान्य से अधिक समय लग रहा है, लेकिन प्रक्रिया अभी चल रही है। अगर कुछ मिनट में वीडियो न आए तो वही विषय फिर भेजें।',
          kannada: '⏱️ ವೀಡಿಯೊ ರಚನೆಗೆ ಸಾಮಾನ್ಯಕ್ಕಿಂತ ಹೆಚ್ಚು ಸಮಯ ಬೇಕಾಗಿದೆ, ಆದರೆ ಪ್ರಕ್ರಿಯೆ ಇನ್ನೂ ನಡೆಯುತ್ತಿದೆ. ಕೆಲವು ನಿಮಿಷಗಳಲ್ಲಿ ಬರದಿದ್ದರೆ ಅದೇ ವಿಷಯವನ್ನು ಮತ್ತೆ ಕಳುಹಿಸಿ.',
        })
      : formatted;

    await this.mediaHandler.sendText(to, localized);
  }
}
