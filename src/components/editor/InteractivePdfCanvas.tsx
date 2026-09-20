'use client';

import React, { useRef, useState } from 'react';
import { DocumentField, Recipient } from '@/types';
import { FieldRenderer } from '@/components/fields/FieldRenderer';
import { cn } from '@/lib/utils';
import { Settings2, Trash2, Scaling } from 'lucide-react';

interface InteractivePdfCanvasProps {
  pageNumber: number;
  fields: DocumentField[];
  recipients: Recipient[];
  selectedFieldId: string | null;
  onSelectField: (field: DocumentField) => void;
  onUpdateFieldPosition: (fieldId: string, x_pct: number, y_pct: number) => void;
  onUpdateFieldSize?: (fieldId: string, width_pct: number, height_pct: number) => void;
  onDeleteField: (fieldId: string) => void;
  onConfigureField: (field: DocumentField) => void;
  pdfPageDataUrl?: string;
  isSignerMode?: boolean;
  fieldValues?: Record<string, string>;
  onFieldValueChange?: (fieldId: string, val: string) => void;
  onOpenSignatureModal?: (fieldId: string) => void;
}

export function InteractivePdfCanvas({
  pageNumber,
  fields,
  recipients,
  selectedFieldId,
  onSelectField,
  onUpdateFieldPosition,
  onUpdateFieldSize,
  onDeleteField,
  onConfigureField,
  pdfPageDataUrl,
  isSignerMode = false,
  fieldValues = {},
  onFieldValueChange,
  onOpenSignatureModal,
}: InteractivePdfCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Drag move state
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; initXPct: number; initYPct: number } | null>(null);

  // Resize drag state
  const [resizingFieldId, setResizingFieldId] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{
    x: number;
    y: number;
    initWidthPct: number;
    initHeightPct: number;
    handle: 'se' | 'e' | 's';
  } | null>(null);

  const pageFields = fields.filter((f) => f.page === pageNumber);

  const handleMouseDownMove = (e: React.MouseEvent, field: DocumentField) => {
    if (isSignerMode) return;
    e.stopPropagation();
    onSelectField(field);

    setDraggingFieldId(field.id);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      initXPct: Number(field.x_pct),
      initYPct: Number(field.y_pct),
    });
  };

  const handleMouseDownResize = (e: React.MouseEvent, field: DocumentField, handle: 'se' | 'e' | 's') => {
    if (isSignerMode) return;
    e.stopPropagation();
    onSelectField(field);

    setResizingFieldId(field.id);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      initWidthPct: Number(field.width_pct),
      initHeightPct: Number(field.height_pct),
      handle,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();

    // 1. Moving field
    if (draggingFieldId && dragStart) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      const deltaXPct = (deltaX / rect.width) * 100;
      const deltaYPct = (deltaY / rect.height) * 100;

      const currentField = fields.find((f) => f.id === draggingFieldId);
      if (!currentField) return;

      const newXPct = Math.max(0, Math.min(100 - Number(currentField.width_pct), dragStart.initXPct + deltaXPct));
      const newYPct = Math.max(0, Math.min(100 - Number(currentField.height_pct), dragStart.initYPct + deltaYPct));

      onUpdateFieldPosition(draggingFieldId, parseFloat(newXPct.toFixed(2)), parseFloat(newYPct.toFixed(2)));
    }

    // 2. Resizing field
    if (resizingFieldId && resizeStart && onUpdateFieldSize) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;

      const deltaWidthPct = (deltaX / rect.width) * 100;
      const deltaHeightPct = (deltaY / rect.height) * 100;

      const currentField = fields.find((f) => f.id === resizingFieldId);
      if (!currentField) return;

      let newWidthPct = Number(currentField.width_pct);
      let newHeightPct = Number(currentField.height_pct);

      if (resizeStart.handle === 'se' || resizeStart.handle === 'e') {
        newWidthPct = Math.max(5, Math.min(100 - Number(currentField.x_pct), resizeStart.initWidthPct + deltaWidthPct));
      }
      if (resizeStart.handle === 'se' || resizeStart.handle === 's') {
        newHeightPct = Math.max(2, Math.min(100 - Number(currentField.y_pct), resizeStart.initHeightPct + deltaHeightPct));
      }

      onUpdateFieldSize(resizingFieldId, parseFloat(newWidthPct.toFixed(2)), parseFloat(newHeightPct.toFixed(2)));
    }
  };

  const handleMouseUp = () => {
    setDraggingFieldId(null);
    setDragStart(null);
    setResizingFieldId(null);
    setResizeStart(null);
  };

  return (
    <div
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="relative w-full max-w-[800px] aspect-[1/1.414] bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-700/60 my-6 mx-auto select-none"
    >
      {/* Background: PDF Page Render */}
      {pdfPageDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pdfPageDataUrl}
          alt={`Page ${pageNumber}`}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
      ) : (
        <div className="absolute inset-0 p-12 flex flex-col justify-between text-slate-800 pointer-events-none opacity-40">
          <div>
            <div className="h-6 w-48 bg-slate-300 rounded mb-4" />
            <div className="space-y-2">
              <div className="h-3 w-full bg-slate-200 rounded" />
              <div className="h-3 w-11/12 bg-slate-200 rounded" />
              <div className="h-3 w-4/5 bg-slate-200 rounded" />
              <div className="h-3 w-5/6 bg-slate-200 rounded" />
            </div>
          </div>
          <div className="text-right text-xs text-slate-400">Page {pageNumber}</div>
        </div>
      )}

      {/* Field Overlay Layer */}
      {pageFields.map((field) => {
        const isSelected = selectedFieldId === field.id;
        const recipient = recipients.find((r) => r.id === field.recipient_id);

        return (
          <div
            key={field.id}
            onMouseDown={(e) => handleMouseDownMove(e, field)}
            style={{
              position: 'absolute',
              left: `${field.x_pct}%`,
              top: `${field.y_pct}%`,
              width: `${field.width_pct}%`,
              height: `${field.height_pct}%`,
            }}
            className={cn(
              'group transition-shadow',
              !isSignerMode && 'cursor-grab active:cursor-grabbing hover:z-20'
            )}
          >
            <FieldRenderer
              field={field}
              recipient={recipient}
              mode={isSignerMode ? 'signer' : 'editor'}
              isSelected={isSelected}
              value={fieldValues[field.id] || field.value || ''}
              onChange={(val) => onFieldValueChange?.(field.id, val)}
              onOpenSignatureModal={onOpenSignatureModal}
              onSelectField={onSelectField}
            />

            {/* Interactive Resizing Handles in Editor Mode */}
            {!isSignerMode && isSelected && (
              <>
                {/* Bottom-Right Corner Resize Handle */}
                <div
                  onMouseDown={(e) => handleMouseDownResize(e, field, 'se')}
                  className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-indigo-600 rounded-sm cursor-nwse-resize z-40 shadow hover:scale-125 transition-transform"
                  title="Drag to resize width & height"
                />

                {/* Right Edge Resize Handle */}
                <div
                  onMouseDown={(e) => handleMouseDownResize(e, field, 'e')}
                  className="absolute top-1/2 -right-1 w-2 h-3 -translate-y-1/2 bg-white border border-indigo-600 rounded-sm cursor-ew-resize z-40 shadow"
                  title="Drag to adjust width"
                />

                {/* Bottom Edge Resize Handle */}
                <div
                  onMouseDown={(e) => handleMouseDownResize(e, field, 's')}
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-2 bg-white border border-indigo-600 rounded-sm cursor-ns-resize z-40 shadow"
                  title="Drag to adjust height"
                />

                {/* Quick Action Badges */}
                <div className="absolute -top-7 right-0 flex items-center gap-1 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 shadow-lg z-30">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onConfigureField(field);
                    }}
                    className="p-1 hover:text-indigo-400 text-slate-300"
                    title="Configure Label, Font Size & Properties"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteField(field.id);
                    }}
                    className="p-1 hover:text-red-400 text-slate-300"
                    title="Delete Field"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
