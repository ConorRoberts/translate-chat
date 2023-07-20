"use client";

import { Message, useChat, useCompletion } from "ai/react";
import { FC, useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { LanguageDefinition, languages } from "~/utils/languages";
import { cn } from "~/utils/shadcn-ui";
import { Label } from "./ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export const Chat = () => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] =
    useState<SpeechSynthesisVoice | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const { messages, setInput, isLoading, append } = useChat({
    onFinish: (res) => {
      const msg = new SpeechSynthesisUtterance(res.content);

      msg.voice = selectedVoice;
      msg.rate = 1.2;

      window.speechSynthesis.speak(msg);
    },
  });

  const [language, setLanguage] = useState<LanguageDefinition>({
    code: "de-DE",
    name: "German (Germany)",
  });

  useEffect(() => {
    if (bottom.current) {
      window.speechSynthesis.cancel();
      bottom.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  const onRecognitionResult = useCallback(
    (e: SpeechRecognitionEvent) => {
      if (isLoading) {
        return;
      }

      const message = e.results[e.results.length - 1][0].transcript;

      flushSync(() => {
        append({
          content: message,
          role: "user",
        });
      });
    },
    [isLoading, append]
  );

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    const recognition = new SpeechRecognition();

    recognition.lang = language.code;
    recognition.continuous = true;

    recognition.onresult = onRecognitionResult;

    recognition.start();

    return () => {
      recognition.stop();
    };
  }, [setInput, language, onRecognitionResult]);

  useEffect(() => {
    if (voices.length > 0) {
      return;
    }

    window.speechSynthesis.onvoiceschanged = () => {
      const v = window.speechSynthesis.getVoices();

      if (v.length === 0) {
        return;
      }

      setVoices(v);

      const foundVoice = v.find((e) => e.lang === language.code);

      if (foundVoice) {
        setSelectedVoice(foundVoice);
      }
    };
  }, [voices, language.code]);

  return (
    <div className="mx-auto w-full max-w-3xl sm:py-24 flex flex-col stretch gap-4 relative">
      <div className="flex items-center justify-center flex-col sm:flex-row gap-2 bg-white/90 backdrop-blur-lg sticky top-0 z-10 p-2 rounded-b-xl">
        <div className="flex-1">
          <Label>Language</Label>
          <Select
            onValueChange={(v) => {
              const lang = languages.find((l) => l.code === v);
              if (lang) {
                setLanguage(lang);
                const foundVoice = voices.find((e) => e.lang === lang.code);
                if (foundVoice) {
                  flushSync(() => {
                    setSelectedVoice(foundVoice);
                  });
                }
                append({
                  content: `The conversation is now in ${lang.name}`,
                  role: "system",
                });
              }
            }}
            value={language.code}
          >
            <SelectTrigger>
              <SelectValue>{language.name}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {languages.map((l) => (
                <SelectItem value={l.code} key={`option ${l.code}`}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Label>Voice</Label>
          <Select
            onValueChange={(v) => {
              const voice = voices.find((e) => e.name === v);
              if (voice) {
                setSelectedVoice(voice);
              }
            }}
            value={selectedVoice?.name ?? "None"}
          >
            <SelectTrigger>
              <SelectValue>{selectedVoice?.name ?? "None"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {voices.map((v) => (
                <SelectItem value={v.name} key={`voice ${v.name}`}>
                  {v.name} ({v.lang})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ChatMessageList messages={messages} language={language} />

      <div ref={bottom} />
    </div>
  );
};

const ChatMessageList: FC<{
  messages: Message[];
  language: LanguageDefinition;
}> = (props) => {
  return (
    <div className="flex flex-col gap-4 relative">
      {props.messages.map((m) => (
        <ChatMessage key={m.id} data={m} language={props.language} />
      ))}
    </div>
  );
};

const ChatMessage: FC<{ data: Message; language: LanguageDefinition }> = (
  props
) => {
  const messageElement = useRef<HTMLParagraphElement>(null);
  const { complete, completion, isLoading } = useCompletion({
    onResponse: () => {
      if (messageElement.current) {
        messageElement.current.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }
    },
  });
  const [showPopover, setShowPopover] = useState(false);

  useEffect(() => {
    if (isLoading || !showPopover || completion.length > 0) {
      return;
    }

    complete(
      `Translate the following ${props.language.name} text to English: "${props.data.content}"`
    );
  }, [
    props.data.content,
    complete,
    isLoading,
    completion,
    showPopover,
    props.language,
  ]);

  return (
    <div
      className={cn(
        "flex",
        props.data.role === "assistant" && "justify-end",
        props.data.role === "system" && "justify-center"
      )}
    >
      {props.data.role === "system" && (
        <p className="text-center my-8 text-sm text-gray-500">
          {props.data.content}
        </p>
      )}
      {props.data.role !== "system" && (
        <Popover open={showPopover} onOpenChange={setShowPopover}>
          <PopoverTrigger
            className={cn(
              "w-3/4 border rounded-3xl p-4 hover:brightness-90 transition duration-75",
              props.data.role === "user" ? "bg-blue-500 text-white" : "bg-white"
            )}
          >
            <p className="text-left" ref={messageElement}>
              {props.data.content}
            </p>
          </PopoverTrigger>
          <PopoverContent className="w-full max-w-full sm:max-w-md md:max-w-2xl">
            {completion}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};
