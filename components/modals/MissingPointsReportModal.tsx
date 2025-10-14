import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from 'lucide-react';

interface MissingPointsReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  missingPointsData: Array<{
    equipmentName: string;
    missingPoints: string[];
  }>;
}

export function MissingPointsReportModal({
  isOpen,
  onClose,
  missingPointsData
}: MissingPointsReportModalProps) {
  const totalMissing = missingPointsData.reduce((sum, item) => sum + item.missingPoints.length, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Missing Points Report
          </DialogTitle>
          <DialogDescription>
            The following tracked points could not be found on their respective equipment.
            These points were likely tracked from a different equipment and do not exist on the target equipment.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="w-4 h-4" />
              <span>
                <strong>{totalMissing}</strong> point{totalMissing !== 1 ? 's' : ''} could not be applied
                to <strong>{missingPointsData.length}</strong> equipment item{missingPointsData.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[400px] pr-4">
            <div className="space-y-4">
              {missingPointsData.map((equipmentData, idx) => (
                <div key={idx} className="border border-border rounded-lg p-4 bg-card">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {equipmentData.equipmentName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {equipmentData.missingPoints.length} missing point{equipmentData.missingPoints.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {equipmentData.missingPoints.map((pointName, pointIdx) => (
                      <div
                        key={pointIdx}
                        className="flex items-center gap-2 text-sm py-1 px-2 bg-muted/50 rounded"
                      >
                        <X className="w-3 h-3 text-red-500 flex-shrink-0" />
                        <span className="font-mono text-xs text-muted-foreground flex-1 truncate" title={pointName}>
                          {pointName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground flex-1">
            These points were not saved to the database for the affected equipment.
          </div>
          <Button onClick={onClose} variant="default">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
