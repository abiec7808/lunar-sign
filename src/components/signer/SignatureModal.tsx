'use client';

import React, { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pen, Type as TypeIcon, Upload, RotateCcw, Check } from 'lucide-react';
import { SignatureMethod } from '@/types';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSignature: (signatureData: string, method: SignatureMethod, font?: string) => void;
  defaultName?: string;
  isInitials?: boolean;
}

const HANDWRITING_FONTS = [
  { name: 'Dancing Script', className: 'font-dancing-script' },
  { name: 'Great Vibes', className: 'font-great-vibes' },
  { name: 'Caveat', className: 'font-caveat' },
  { name: 'Sacramento', className: 'font-sacramento' },
];

export function SignatureModal({
  isOpen,
  onClose,
  onSaveSignature,
  defaultName = '',
  isInitials = false,
}: SignatureModalProps) {
  const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'upload'>('draw');
  
  // Draw State
  const sigCanvasRef = useRef<SignatureCanvas | null>(null);
  const [strokeColor, setStrokeColor] = useState('#0f172a');
  
  // Type State
  const [typedText, setTypedText] = useState(
    isInitials
      ? defaultName.split(' ').map((n) => n[0]).join('').toUpperCase()
      : defaultName
  );
  const [selectedFont, setSelectedFont] = useState(HANDWRITING_FONTS[0].name);

  // Upload State
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const handleClearCanvas = () => {
    sigCanvasRef.current?.clear();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas to remove light background and make it transparent
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Auto background-removal: lighten near-white pixels to transparent
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // If luminance is high (white / light paper background), make transparent
          if (r > 200 && g > 200 && b > 200) {
            data[i + 3] = 0;
          }
        }
        ctx.putImageData(imgData, 0, 0);
        setUploadedImage(canvas.toDataURL('image/png'));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (activeTab === 'draw') {
      if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
        const dataUrl = sigCanvasRef.current.getTrimmedCanvas().toDataURL('image/png');
        onSaveSignature(dataUrl, 'drawn');
        onClose();
      }
    } else if (activeTab === 'type') {
      if (typedText.trim()) {
        // Render text to canvas to export as transparent PNG
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.font = `60px "${selectedFont}", cursive`;
          ctx.fillStyle = '#0f172a';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(typedText, 300, 100);
          const dataUrl = canvas.toDataURL('image/png');
          onSaveSignature(dataUrl, 'typed', selectedFont);
          onClose();
        }
      }
    } else if (activeTab === 'upload') {
      if (uploadedImage) {
        onSaveSignature(uploadedImage, 'uploaded');
        onClose();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl bg-slate-900 border-slate-700 text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Pen className="w-5 h-5 text-indigo-400" />
            Adopt Your {isInitials ? 'Initials' : 'Signature'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'draw' | 'type' | 'upload')}>
          <TabsList className="grid grid-cols-3 w-full bg-slate-950 border-slate-800">
            <TabsTrigger value="draw" className="flex items-center gap-2">
              <Pen className="w-4 h-4" /> Draw
            </TabsTrigger>
            <TabsTrigger value="type" className="flex items-center gap-2">
              <TypeIcon className="w-4 h-4" /> Type
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" /> Upload
            </TabsTrigger>
          </TabsList>

          {/* 1. DRAW TAB */}
          <TabsContent value="draw" className="space-y-4 pt-2">
            <div className="relative border-2 border-dashed border-slate-700 rounded-xl bg-white overflow-hidden shadow-inner h-56 flex items-center justify-center touch-none">
              <SignatureCanvas
                ref={sigCanvasRef}
                penColor={strokeColor}
                canvasProps={{
                  className: 'w-full h-full cursor-crosshair touch-none',
                  style: { width: '100%', height: '100%', touchAction: 'none' },
                }}
              />
              <div className="absolute bottom-2 left-2 flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                  Ink Color:
                </span>
                <button
                  type="button"
                  onClick={() => setStrokeColor('#0f172a')}
                  className={`w-5 h-5 rounded-full bg-slate-900 border ${strokeColor === '#0f172a' ? 'ring-2 ring-indigo-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setStrokeColor('#1e40af')}
                  className={`w-5 h-5 rounded-full bg-blue-800 border ${strokeColor === '#1e40af' ? 'ring-2 ring-indigo-500' : ''}`}
                />
              </div>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Sign using your mouse, trackpad, finger, or stylus</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearCanvas}
                className="text-slate-400 hover:text-white"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Clear Canvas
              </Button>
            </div>
          </TabsContent>

          {/* 2. TYPE TAB */}
          <TabsContent value="type" className="space-y-4 pt-2">
            <div>
              <Label className="text-slate-300">Your Full Legal Name</Label>
              <Input
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder="Type your name..."
                className="mt-1 bg-slate-950 border-slate-700 text-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {HANDWRITING_FONTS.map((font) => (
                <div
                  key={font.name}
                  onClick={() => setSelectedFont(font.name)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all bg-white text-slate-900 flex flex-col items-center justify-center min-h-[80px] ${
                    selectedFont === font.name
                      ? 'border-indigo-500 ring-2 ring-indigo-500 shadow-md'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                >
                  <span className={`text-2xl text-slate-900 truncate max-w-full ${font.className}`}>
                    {typedText || 'Signature'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-sans mt-1">{font.name}</span>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* 3. UPLOAD TAB */}
          <TabsContent value="upload" className="space-y-4 pt-2">
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center bg-slate-950/60 hover:bg-slate-950 transition-colors">
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleFileUpload}
                className="hidden"
                id="signature-upload"
              />
              <label htmlFor="signature-upload" className="cursor-pointer flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-indigo-400" />
                <span className="text-sm font-semibold text-slate-200">
                  Upload Wet Signature Image (PNG / JPG)
                </span>
                <span className="text-xs text-slate-400">
                  White paper backgrounds are automatically removed to transparent
                </span>
              </label>
            </div>

            {uploadedImage && (
              <div className="p-3 bg-white rounded-xl flex items-center justify-center h-28 border border-slate-300">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={uploadedImage} alt="Uploaded Signature" className="max-h-full max-w-full object-contain" />
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="default" onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-500">
            <Check className="w-4 h-4 mr-1.5" /> Adopt & Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
