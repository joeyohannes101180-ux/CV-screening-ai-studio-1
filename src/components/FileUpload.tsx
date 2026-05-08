import React, { useCallback } from 'react';
import { useDropzone, DropzoneOptions } from 'react-dropzone';
import { Upload, X, FileText, File as FileIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { InputContent } from '../lib/types';

interface FileUploadProps {
  id: string;
  label: string;
  content: InputContent;
  onChange: (content: InputContent) => void;
  maxFiles?: number;
  placeholderText?: string;
}

export function FileUpload({ label, content, onChange, placeholderText }: FileUploadProps) {
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        onChange({
          ...content,
          file: {
            data: base64,
            mimeType: file.type,
            name: file.name
          }
        });
      };
    }
  }, [content, onChange]);

  const dropzoneOptions: any = {
    onDrop,
    maxFiles: 1,
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.jpeg', '.jpg', '.png'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone(dropzoneOptions);

  return (
    <div className="flex flex-col gap-4">
      {label && (
        <label className="text-sm font-bold uppercase tracking-widest text-slate-400">
          {label}
        </label>
      )}
      
      {!content.file ? (
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-blue-500/50 flex flex-col items-center justify-center gap-4 group shadow-lg",
            isDragActive && "border-blue-500 bg-blue-500/5"
          )}
        >
          <input {...getInputProps()} />
          <Upload className={cn(
            "w-8 h-8 transition-colors",
            isDragActive ? "text-blue-500" : "text-slate-500 group-hover:text-blue-400"
          )} />
          <div className="flex flex-col gap-1">
            <p className="text-base text-slate-300 font-semibold">
              {placeholderText || "Upload file"}
            </p>
            <span className="text-xs text-slate-500 uppercase tracking-tight">
              PDF, DOCX, XLSX, Images Supported
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl group transition-all">
          <div className="flex items-center gap-4 overflow-hidden">
            <div className="p-3 bg-white/5 rounded-xl shrink-0 shadow-sm border border-white/10">
              <FileIcon className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-bold text-slate-100 truncate">
                {content.file.name}
              </span>
              <span className="text-xs text-blue-400 font-medium">Ready for analysis</span>
            </div>
          </div>
          <button
            onClick={() => onChange({ ...content, file: undefined })}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-500 hover:text-rose-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="relative group">
        <textarea
          value={content.text}
          onChange={(e) => onChange({ ...content, text: e.target.value })}
          placeholder="Or paste the text content here..."
          className="w-full min-h-[180px] px-5 py-4 bg-black/40 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-all outline-none text-sm text-slate-200 resize-none font-sans leading-relaxed placeholder:text-slate-600 shadow-inner"
        />
        <div className="absolute top-3 right-3 flex items-center gap-2 px-2 py-1 bg-white/5 rounded text-[10px] text-slate-500 uppercase tracking-widest font-black opacity-40 group-hover:opacity-100 transition-opacity">
          <FileText className="w-3 h-3" />
          Text input
        </div>
      </div>
    </div>
  );
}
