'use client';

import React, { useState, useCallback } from 'react';
import { useAppStore } from '../../store/app-store';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Menu, X } from 'lucide-react';

interface ThreePanelLayoutProps {
  leftPanel: React.ReactNode;
  middlePanel: React.ReactNode;
  rightPanel: React.ReactNode;
  header?: React.ReactNode;
}

export function ThreePanelLayout({
  leftPanel,
  middlePanel,
  rightPanel,
  header
}: ThreePanelLayoutProps) {
  const {
    leftPanelWidth,
    rightPanelWidth,
    showMobilePanels,
    setPanelWidth,
    toggleMobilePanel
  } = useAppStore();

  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);

  const handleMouseDown = useCallback((panel: 'left' | 'right') => {
    setIsResizing(panel);
  }, []);

  // Mouse move and up handlers are implemented in useEffect below

  React.useEffect(() => {
    if (isResizing) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const containerWidth = window.innerWidth;
        const mouseX = e.clientX;

        if (isResizing === 'left') {
          const newWidth = Math.max(300, Math.min(600, mouseX));
          setPanelWidth('left', newWidth);
        } else if (isResizing === 'right') {
          const newWidth = Math.max(350, Math.min(600, containerWidth - mouseX));
          setPanelWidth('right', newWidth);
        }
      };

      const handleGlobalMouseUp = () => {
        setIsResizing(null);
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isResizing, setPanelWidth]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      {header && (
        <header className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {header}
        </header>
      )}

      {/* Mobile Panel Toggle Buttons */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-muted/50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleMobilePanel('left')}
          className="flex items-center gap-2"
        >
          <Menu className="h-4 w-4" />
          Equipment
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleMobilePanel('right')}
          className="flex items-center gap-2"
        >
          <Menu className="h-4 w-4" />
          CxAlloy
        </Button>
      </div>

      {/* Main Layout */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Left Panel */}
        <div
          className={cn(
            "flex-shrink-0 bg-muted/30 border-r border-border transition-all duration-200 ease-in-out",
            "lg:relative lg:translate-x-0",
            showMobilePanels.left 
              ? "absolute inset-y-0 left-0 z-40 translate-x-0 shadow-lg" 
              : "absolute inset-y-0 left-0 z-40 -translate-x-full lg:translate-x-0"
          )}
          style={{ width: `${leftPanelWidth}px` }}
        >
          {/* Mobile Close Button */}
          <div className="lg:hidden absolute top-4 right-4 z-50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleMobilePanel('left')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {leftPanel}
        </div>

        {/* Left Resize Handle */}
        <div
          className="hidden lg:block w-1 bg-border hover:bg-primary/20 cursor-col-resize transition-colors duration-150 active:bg-primary/40"
          onMouseDown={() => handleMouseDown('left')}
        />

        {/* Middle Panel */}
        <div className="flex-1 flex flex-col bg-background overflow-hidden">
          {middlePanel}
        </div>

        {/* Right Resize Handle */}
        <div
          className="hidden lg:block w-1 bg-border hover:bg-primary/20 cursor-col-resize transition-colors duration-150 active:bg-primary/40"
          onMouseDown={() => handleMouseDown('right')}
        />

        {/* Right Panel */}
        <div
          className={cn(
            "flex-shrink-0 bg-muted/30 border-l border-border transition-all duration-200 ease-in-out",
            "lg:relative lg:translate-x-0",
            showMobilePanels.right 
              ? "absolute inset-y-0 right-0 z-40 translate-x-0 shadow-lg" 
              : "absolute inset-y-0 right-0 z-40 translate-x-full lg:translate-x-0"
          )}
          style={{ width: `${rightPanelWidth}px` }}
        >
          {/* Mobile Close Button */}
          <div className="lg:hidden absolute top-4 left-4 z-50">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleMobilePanel('right')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {rightPanel}
        </div>

        {/* Mobile Overlay */}
        {(showMobilePanels.left || showMobilePanels.right) && (
          <div
            className="lg:hidden absolute inset-0 bg-black/50 z-30"
            onClick={() => {
              if (showMobilePanels.left) toggleMobilePanel('left');
              if (showMobilePanels.right) toggleMobilePanel('right');
            }}
          />
        )}
      </main>
    </div>
  );
} 