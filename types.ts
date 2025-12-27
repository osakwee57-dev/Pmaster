
export type ToolType = 'scan' | 'text' | 'image' | 'edit' | 'gs_compress' | 'drafts';

export interface PDFToolProps {
  onBack: () => void;
  initialData?: any;
  draftId?: string;
}

export interface Draft {
  id: string;
  type: ToolType;
  title: string;
  lastEdited: number;
  data: any;
  thumbnail?: string;
}
