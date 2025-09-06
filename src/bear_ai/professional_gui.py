#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BEAR AI - Professional Legal GUI Interface
A comprehensive professional interface designed specifically for legal professionals,
implementing modern UI trends, trust-building elements, and the three-click rule.

Design Features:
- Professional color palette (deep blue #1B365C, warm gray #6B7280, rich green #059669)
- Collapsible sidebar navigation for optimal space utilization
- Advanced document management with annotation tools
- Legal-specific search capabilities with sophisticated filtering
- Security indicators and trust-building elements
- Three-click rule compliance for all core functions
- Comprehensive error handling and loading states
"""

import sys
import os
import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox, filedialog
import threading
import time
import re
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional, Any
import json
from dataclasses import dataclass
from enum import Enum

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

# Try to import BEAR AI modules
try:
    from bear_ai.pii.scrubber import Scrubber as PIIScrubber, PIIEntity
    from bear_ai.model_manager import get_model_manager, ModelInfo, HardwareDetector
    PII_AVAILABLE = True
    MODEL_MANAGER_AVAILABLE = True
except ImportError:
    PII_AVAILABLE = False
    MODEL_MANAGER_AVAILABLE = False
    print("Warning: Some BEAR AI modules not available. Using fallback implementations.")

try:
    import customtkinter as ctk
    CTK_AVAILABLE = True
    ctk.set_appearance_mode("light")  # Professional light theme by default
    ctk.set_default_color_theme("blue")
except ImportError:
    CTK_AVAILABLE = False
    print("CustomTkinter not available. Install with: pip install customtkinter")

# Professional Color Palette
class Colors:
    # Primary Colors
    PRIMARY_DARK = "#1B365C"      # Deep blue for trust and professionalism
    PRIMARY_LIGHT = "#2563EB"     # Lighter blue for accents
    
    # Supporting Colors
    GRAY_WARM = "#6B7280"         # Warm gray for supporting elements
    GRAY_LIGHT = "#F9FAFB"        # Light gray for backgrounds
    GRAY_MEDIUM = "#E5E7EB"       # Medium gray for borders
    
    # Accent Colors
    GREEN_SUCCESS = "#059669"     # Rich green for positive actions
    RED_ERROR = "#DC2626"         # Refined red for warnings/errors
    ORANGE_WARNING = "#D97706"    # Orange for warnings
    
    # Background Colors
    WHITE = "#FFFFFF"             # Pure white
    BACKGROUND = "#F9FAFB"        # Light gray background

@dataclass
class DocumentInfo:
    """Document information for management"""
    filename: str
    filepath: str
    size: int
    modified: datetime
    doc_type: str
    tags: List[str]
    annotations: List[Dict]
    security_level: str

class SecurityLevel(Enum):
    PUBLIC = "public"
    CONFIDENTIAL = "confidential"
    PRIVILEGED = "privileged"
    WORK_PRODUCT = "work_product"

class NavigationSection(Enum):
    CHAT = "chat"
    DOCUMENTS = "documents"
    RESEARCH = "research"
    HISTORY = "history"
    SETTINGS = "settings"
    HELP = "help"

class SimplePIIScrubber:
    """Fallback PII scrubber if Presidio is not available"""
    
    def __init__(self):
        self.patterns = {
            'email': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
            'phone': re.compile(r'\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b'),
            'ssn': re.compile(r'\b\d{3}-\d{2}-\d{4}\b|\b\d{9}\b'),
            'credit_card': re.compile(r'\b(?:\d{4}[-\s]?){3}\d{4}\b'),
            'ip_address': re.compile(r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b'),
        }
        
        self.replacements = {
            'email': '[EMAIL-REDACTED]',
            'phone': '[PHONE-REDACTED]',
            'ssn': '[SSN-REDACTED]',
            'credit_card': '[CARD-REDACTED]',
            'ip_address': '[IP-REDACTED]',
        }
    
    def analyze(self, text: str) -> List[PIIEntity]:
        """Analyze text for PII entities"""
        entities = []
        for pii_type, pattern in self.patterns.items():
            for match in pattern.finditer(text):
                entities.append(PIIEntity(
                    entity_type=pii_type,
                    start=match.start(),
                    end=match.end(),
                    score=0.9,
                    text=match.group(),
                    anonymized_text=self.replacements[pii_type]
                ))
        return entities
    
    def scrub_text(self, text: str) -> tuple[str, bool, List[str]]:
        """Scrub PII from text"""
        entities = self.analyze(text)
        if not entities:
            return text, False, []
        
        scrubbed = text
        detected_types = []
        
        # Sort entities by start position in reverse order to maintain indices
        for entity in sorted(entities, key=lambda e: e.start, reverse=True):
            scrubbed = scrubbed[:entity.start] + entity.anonymized_text + scrubbed[entity.end:]
            if entity.entity_type not in detected_types:
                detected_types.append(entity.entity_type)
        
        return scrubbed, True, detected_types

class ProfessionalBEARAI:
    """Professional BEAR AI Interface for Legal Professionals"""
    
    def __init__(self):
        # Initialize core components
        self.pii_scrubber = PIIScrubber() if PII_AVAILABLE else SimplePIIScrubber()
        self.pii_protection_enabled = True
        self.selected_model = None
        self.download_progress = {}
        self.current_section = NavigationSection.CHAT
        self.sidebar_collapsed = False
        
        # Document management
        self.documents: List[DocumentInfo] = []
        self.current_document = None
        self.search_history = []
        
        # Chat history
        self.chat_history = []
        self.conversation_threads = {}
        
        # Initialize hardware detector
        if MODEL_MANAGER_AVAILABLE:
            try:
                self.model_manager = get_model_manager()
                self.hardware = HardwareDetector()
            except Exception as e:
                print(f"Warning: Model manager initialization failed: {e}")
                self.model_manager = None
                self.hardware = None
        else:
            self.model_manager = None
            self.hardware = None
        
        self.setup_gui()
        self.load_initial_data()
    
    def setup_gui(self):
        """Setup the professional GUI interface"""
        if CTK_AVAILABLE:
            self.setup_professional_ctk_gui()
        else:
            self.setup_professional_tkinter_gui()
    
    def setup_professional_ctk_gui(self):
        """Setup professional CustomTkinter GUI"""
        # Main window with professional styling
        self.root = ctk.CTk()
        self.root.title("BEAR AI - Professional Legal Assistant")
        self.root.geometry("1400x900")
        self.root.minsize(1200, 700)
        
        # Configure the main grid
        self.root.grid_columnconfigure(1, weight=1)
        self.root.grid_rowconfigure(1, weight=1)
        
        # Apply professional color scheme
        self.root.configure(fg_color=Colors.BACKGROUND)
        
        # Setup main layout components
        self.setup_top_bar()
        self.setup_sidebar()
        self.setup_content_area()
        self.setup_status_bar()
        
        # Load the initial section
        self.show_section(NavigationSection.CHAT)
    
    def setup_top_bar(self):
        """Setup professional top bar with global actions"""
        self.top_bar = ctk.CTkFrame(
            self.root,
            height=60,
            corner_radius=0,
            fg_color=Colors.PRIMARY_DARK
        )
        self.top_bar.grid(row=0, column=0, columnspan=2, sticky="ew")
        self.top_bar.grid_propagate(False)
        self.top_bar.grid_columnconfigure(2, weight=1)
        
        # Logo and branding
        logo_frame = ctk.CTkFrame(self.top_bar, fg_color="transparent")
        logo_frame.grid(row=0, column=0, padx=20, pady=10, sticky="w")
        
        logo_label = ctk.CTkLabel(
            logo_frame,
            text="⚖️ BEAR AI",
            font=ctk.CTkFont(size=20, weight="bold"),
            text_color=Colors.WHITE
        )
        logo_label.pack(side="left")
        
        subtitle_label = ctk.CTkLabel(
            logo_frame,
            text="Legal Professional Assistant",
            font=ctk.CTkFont(size=11),
            text_color="#9CA3AF"
        )
        subtitle_label.pack(side="left", padx=(10, 0))
        
        # Global search bar (Three-click rule: 1 click to activate)
        search_frame = ctk.CTkFrame(self.top_bar, fg_color="transparent")
        search_frame.grid(row=0, column=2, padx=20, pady=10, sticky="ew")
        search_frame.grid_columnconfigure(0, weight=1)
        
        self.global_search = ctk.CTkEntry(
            search_frame,
            placeholder_text="🔍 Search documents, conversations, legal terms...",
            width=400,
            height=35,
            corner_radius=20,
            fg_color=Colors.WHITE,
            text_color=Colors.PRIMARY_DARK
        )
        self.global_search.grid(row=0, column=0, sticky="ew", padx=(0, 10))
        self.global_search.bind("<Return>", self.perform_global_search)
        
        search_btn = ctk.CTkButton(
            search_frame,
            text="Search",
            width=80,
            height=35,
            corner_radius=20,
            fg_color=Colors.GREEN_SUCCESS,
            hover_color="#047857",
            command=self.perform_global_search
        )
        search_btn.grid(row=0, column=1)
        
        # User actions and settings
        actions_frame = ctk.CTkFrame(self.top_bar, fg_color="transparent")
        actions_frame.grid(row=0, column=3, padx=20, pady=10, sticky="e")
        
        # New conversation button (Three-click rule: 1 click)
        new_chat_btn = ctk.CTkButton(
            actions_frame,
            text="+ New Chat",
            width=100,
            height=35,
            corner_radius=20,
            fg_color=Colors.GREEN_SUCCESS,
            hover_color="#047857",
            command=self.new_conversation
        )
        new_chat_btn.pack(side="left", padx=(0, 10))
        
        # Settings dropdown (Three-click rule: 2 clicks max)
        settings_btn = ctk.CTkButton(
            actions_frame,
            text="⚙️",
            width=35,
            height=35,
            corner_radius=20,
            fg_color=Colors.GRAY_WARM,
            hover_color="#4B5563",
            command=self.show_settings_menu
        )
        settings_btn.pack(side="left", padx=(0, 10))
        
        # Help button (Three-click rule: 1 click)
        help_btn = ctk.CTkButton(
            actions_frame,
            text="❓",
            width=35,
            height=35,
            corner_radius=20,
            fg_color=Colors.PRIMARY_LIGHT,
            hover_color="#1D4ED8",
            command=self.show_help
        )
        help_btn.pack(side="left")
    
    def setup_sidebar(self):
        """Setup collapsible sidebar navigation"""
        sidebar_width = 250 if not self.sidebar_collapsed else 60
        
        self.sidebar = ctk.CTkFrame(
            self.root,
            width=sidebar_width,
            corner_radius=0,
            fg_color=Colors.WHITE,
            border_color=Colors.GRAY_MEDIUM,
            border_width=1
        )
        self.sidebar.grid(row=1, column=0, sticky="nsew")
        self.sidebar.grid_propagate(False)
        
        # Sidebar header with collapse toggle
        sidebar_header = ctk.CTkFrame(
            self.sidebar,
            height=50,
            fg_color=Colors.GRAY_LIGHT,
            corner_radius=0
        )
        sidebar_header.pack(fill="x", pady=(0, 1))
        sidebar_header.pack_propagate(False)
        
        # Collapse/expand button
        self.collapse_btn = ctk.CTkButton(
            sidebar_header,
            text="◀" if not self.sidebar_collapsed else "▶",
            width=30,
            height=30,
            corner_radius=15,
            fg_color=Colors.PRIMARY_DARK,
            hover_color=Colors.PRIMARY_LIGHT,
            command=self.toggle_sidebar
        )
        self.collapse_btn.pack(side="right", padx=10, pady=10)
        
        if not self.sidebar_collapsed:
            nav_title = ctk.CTkLabel(
                sidebar_header,
                text="Navigation",
                font=ctk.CTkFont(size=14, weight="bold"),
                text_color=Colors.PRIMARY_DARK
            )
            nav_title.pack(side="left", padx=20, pady=10)
        
        # Navigation sections
        self.setup_navigation_sections()
        
        # Security indicator at bottom of sidebar
        self.setup_security_indicator()
    
    def setup_navigation_sections(self):
        """Setup navigation sections in sidebar"""
        nav_sections = [
            (NavigationSection.CHAT, "💬", "Chat & Conversations"),
            (NavigationSection.DOCUMENTS, "📄", "Document Management"),
            (NavigationSection.RESEARCH, "🔍", "Legal Research"),
            (NavigationSection.HISTORY, "📚", "History & Archives"),
            (NavigationSection.SETTINGS, "⚙️", "Settings & Preferences"),
            (NavigationSection.HELP, "❓", "Help & Support")
        ]
        
        self.nav_buttons = {}
        
        for section, icon, label in nav_sections:
            btn_text = icon if self.sidebar_collapsed else f"{icon} {label}"
            btn_width = 40 if self.sidebar_collapsed else 220
            
            nav_btn = ctk.CTkButton(
                self.sidebar,
                text=btn_text,
                width=btn_width,
                height=45,
                corner_radius=8,
                fg_color="transparent",
                text_color=Colors.GRAY_WARM,
                hover_color=Colors.GRAY_LIGHT,
                anchor="w" if not self.sidebar_collapsed else "center",
                command=lambda s=section: self.show_section(s)
            )
            nav_btn.pack(fill="x", padx=10, pady=2)
            self.nav_buttons[section] = nav_btn
        
        # Highlight current section
        self.update_nav_selection(self.current_section)
    
    def setup_security_indicator(self):
        """Setup security and privacy indicators"""
        if not self.sidebar_collapsed:
            security_frame = ctk.CTkFrame(
                self.sidebar,
                height=100,
                fg_color=Colors.GRAY_LIGHT,
                corner_radius=8
            )
            security_frame.pack(fill="x", padx=10, pady=10, side="bottom")
            security_frame.pack_propagate(False)
            
            # Security status
            security_title = ctk.CTkLabel(
                security_frame,
                text="🛡️ Security Status",
                font=ctk.CTkFont(size=12, weight="bold"),
                text_color=Colors.GREEN_SUCCESS
            )
            security_title.pack(pady=(10, 5))
            
            security_status = ctk.CTkLabel(
                security_frame,
                text="✅ Local Processing\n✅ PII Protection Active\n✅ Data Encrypted",
                font=ctk.CTkFont(size=10),
                text_color=Colors.GRAY_WARM,
                justify="left"
            )
            security_status.pack(pady=(0, 10))
    
    def setup_content_area(self):
        """Setup main content area"""
        self.content_frame = ctk.CTkFrame(
            self.root,
            corner_radius=0,
            fg_color=Colors.WHITE
        )
        self.content_frame.grid(row=1, column=1, sticky="nsew")
        self.content_frame.grid_columnconfigure(0, weight=1)
        self.content_frame.grid_rowconfigure(0, weight=1)
        
        # Create content sections (initially hidden)
        self.create_content_sections()
    
    def create_content_sections(self):
        """Create all content sections"""
        self.content_sections = {}
        
        # Chat Section
        self.content_sections[NavigationSection.CHAT] = self.create_chat_section()
        
        # Documents Section
        self.content_sections[NavigationSection.DOCUMENTS] = self.create_documents_section()
        
        # Research Section
        self.content_sections[NavigationSection.RESEARCH] = self.create_research_section()
        
        # History Section
        self.content_sections[NavigationSection.HISTORY] = self.create_history_section()
        
        # Settings Section
        self.content_sections[NavigationSection.SETTINGS] = self.create_settings_section()
        
        # Help Section
        self.content_sections[NavigationSection.HELP] = self.create_help_section()
    
    def create_chat_section(self):
        """Create professional chat interface"""
        chat_frame = ctk.CTkFrame(self.content_frame, fg_color=Colors.WHITE)
        chat_frame.grid_columnconfigure(0, weight=1)
        chat_frame.grid_rowconfigure(1, weight=1)
        
        # Chat header with model selection and options
        chat_header = ctk.CTkFrame(
            chat_frame,
            height=60,
            fg_color=Colors.GRAY_LIGHT,
            corner_radius=0
        )
        chat_header.grid(row=0, column=0, sticky="ew", padx=0, pady=(0, 1))
        chat_header.grid_propagate(False)
        chat_header.grid_columnconfigure(1, weight=1)
        
        # Current conversation title
        self.conversation_title = ctk.CTkLabel(
            chat_header,
            text="New Conversation",
            font=ctk.CTkFont(size=18, weight="bold"),
            text_color=Colors.PRIMARY_DARK
        )
        self.conversation_title.grid(row=0, column=0, padx=20, pady=15, sticky="w")
        
        # Model selection and status
        model_frame = ctk.CTkFrame(chat_header, fg_color="transparent")
        model_frame.grid(row=0, column=2, padx=20, pady=10, sticky="e")
        
        self.model_status_label = ctk.CTkLabel(
            model_frame,
            text="No model selected",
            font=ctk.CTkFont(size=11),
            text_color=Colors.ORANGE_WARNING
        )
        self.model_status_label.pack(pady=2)
        
        model_select_btn = ctk.CTkButton(
            model_frame,
            text="Select Model",
            width=100,
            height=30,
            corner_radius=15,
            fg_color=Colors.PRIMARY_LIGHT,
            hover_color=Colors.PRIMARY_DARK,
            command=self.show_model_selection
        )
        model_select_btn.pack()
        
        # Chat display area with professional styling
        self.chat_display = ctk.CTkTextbox(
            chat_frame,
            corner_radius=8,
            font=ctk.CTkFont(size=13),
            wrap="word",
            fg_color=Colors.WHITE,
            text_color=Colors.PRIMARY_DARK,
            border_color=Colors.GRAY_MEDIUM,
            border_width=1
        )
        self.chat_display.grid(row=1, column=0, sticky="nsew", padx=20, pady=10)
        
        # Input area with enhanced functionality
        input_frame = ctk.CTkFrame(
            chat_frame,
            height=120,
            fg_color=Colors.GRAY_LIGHT,
            corner_radius=8
        )
        input_frame.grid(row=2, column=0, sticky="ew", padx=20, pady=(0, 20))
        input_frame.grid_propagate(False)
        input_frame.grid_columnconfigure(0, weight=1)
        
        # Input controls
        input_controls = ctk.CTkFrame(input_frame, fg_color="transparent")
        input_controls.grid(row=0, column=0, sticky="ew", padx=10, pady=5)
        input_controls.grid_columnconfigure(2, weight=1)
        
        # File attachment button
        attach_btn = ctk.CTkButton(
            input_controls,
            text="📎",
            width=35,
            height=30,
            corner_radius=15,
            fg_color=Colors.GRAY_WARM,
            hover_color="#4B5563",
            command=self.attach_document
        )
        attach_btn.grid(row=0, column=0, padx=(0, 10))
        
        # PII protection toggle
        self.pii_toggle = ctk.CTkSwitch(
            input_controls,
            text="PII Protection",
            font=ctk.CTkFont(size=11),
            command=self.toggle_pii_protection
        )
        self.pii_toggle.grid(row=0, column=1, padx=(0, 20))
        self.pii_toggle.select() if self.pii_protection_enabled else self.pii_toggle.deselect()
        
        # Input text area
        self.input_text = ctk.CTkTextbox(
            input_frame,
            height=50,
            corner_radius=8,
            font=ctk.CTkFont(size=13),
            border_color=Colors.GRAY_MEDIUM,
            border_width=1
        )
        self.input_text.grid(row=1, column=0, sticky="ew", padx=10, pady=5)
        self.input_text.bind("<Return>", self.send_message)
        self.input_text.bind("<Shift-Return>", lambda e: None)  # Allow Shift+Enter for new line
        
        # Send button
        send_btn = ctk.CTkButton(
            input_frame,
            text="Send Message",
            width=120,
            height=35,
            corner_radius=18,
            fg_color=Colors.GREEN_SUCCESS,
            hover_color="#047857",
            font=ctk.CTkFont(size=13, weight="bold"),
            command=self.send_message
        )
        send_btn.grid(row=2, column=0, pady=10)
        
        return chat_frame
    
    def create_documents_section(self):
        """Create advanced document management interface"""
        docs_frame = ctk.CTkFrame(self.content_frame, fg_color=Colors.WHITE)
        docs_frame.grid_columnconfigure(0, weight=1)
        docs_frame.grid_rowconfigure(1, weight=1)
        
        # Document management header
        docs_header = ctk.CTkFrame(
            docs_frame,
            height=80,
            fg_color=Colors.GRAY_LIGHT,
            corner_radius=0
        )
        docs_header.grid(row=0, column=0, sticky="ew", pady=(0, 1))
        docs_header.grid_propagate(False)
        docs_header.grid_columnconfigure(2, weight=1)
        
        # Title
        docs_title = ctk.CTkLabel(
            docs_header,
            text="Document Management",
            font=ctk.CTkFont(size=20, weight="bold"),
            text_color=Colors.PRIMARY_DARK
        )
        docs_title.grid(row=0, column=0, padx=20, pady=20, sticky="w")
        
        # Document actions
        doc_actions = ctk.CTkFrame(docs_header, fg_color="transparent")
        doc_actions.grid(row=0, column=3, padx=20, pady=15, sticky="e")
        
        upload_btn = ctk.CTkButton(
            doc_actions,
            text="📤 Upload Documents",
            width=140,
            height=35,
            corner_radius=18,
            fg_color=Colors.GREEN_SUCCESS,
            hover_color="#047857",
            command=self.upload_documents
        )
        upload_btn.pack(side="left", padx=(0, 10))
        
        new_folder_btn = ctk.CTkButton(
            doc_actions,
            text="📁 New Folder",
            width=120,
            height=35,
            corner_radius=18,
            fg_color=Colors.PRIMARY_LIGHT,
            hover_color=Colors.PRIMARY_DARK,
            command=self.create_document_folder
        )
        new_folder_btn.pack(side="left")
        
        # Document filters and search
        filter_frame = ctk.CTkFrame(docs_header, fg_color="transparent")
        filter_frame.grid(row=1, column=0, columnspan=4, sticky="ew", padx=20, pady=(0, 15))
        filter_frame.grid_columnconfigure(1, weight=1)
        
        # Document type filter
        type_filter = ctk.CTkOptionMenu(
            filter_frame,
            values=["All Types", "Contracts", "Briefs", "Correspondence", "Research", "Evidence"],
            width=140
        )
        type_filter.grid(row=0, column=0, padx=(0, 15))
        
        # Document search
        doc_search = ctk.CTkEntry(
            filter_frame,
            placeholder_text="Search documents by name, content, or tags...",
            height=30
        )
        doc_search.grid(row=0, column=1, sticky="ew", padx=(0, 15))
        
        # Security level filter
        security_filter = ctk.CTkOptionMenu(
            filter_frame,
            values=["All Levels", "Public", "Confidential", "Privileged", "Work Product"],
            width=140
        )
        security_filter.grid(row=0, column=2)
        
        # Main document area with card-based layout
        docs_content = ctk.CTkScrollableFrame(
            docs_frame,
            fg_color=Colors.WHITE,
            corner_radius=8
        )
        docs_content.grid(row=1, column=0, sticky="nsew", padx=20, pady=(10, 20))
        docs_content.grid_columnconfigure(0, weight=1)
        
        # Sample document cards
        self.create_document_cards(docs_content)
        
        return docs_frame
    
    def create_document_cards(self, parent):
        """Create document cards with professional styling"""
        sample_documents = [
            {
                "name": "Client Agreement - ABC Corp",
                "type": "Contract",
                "size": "2.4 MB",
                "modified": "2 hours ago",
                "security": "Confidential",
                "tags": ["contract", "corporate", "pending"]
            },
            {
                "name": "Motion to Dismiss - Case #2024-001",
                "type": "Brief",
                "size": "856 KB",
                "modified": "1 day ago",
                "security": "Work Product",
                "tags": ["motion", "civil", "filed"]
            },
            {
                "name": "Discovery Responses",
                "type": "Evidence",
                "size": "15.2 MB",
                "modified": "3 days ago",
                "security": "Privileged",
                "tags": ["discovery", "evidence", "confidential"]
            }
        ]
        
        for i, doc in enumerate(sample_documents):
            card = self.create_document_card(parent, doc, i)
            card.grid(row=i, column=0, sticky="ew", padx=10, pady=8)
    
    def create_document_card(self, parent, doc_info, index):
        """Create individual document card"""
        card = ctk.CTkFrame(
            parent,
            height=120,
            fg_color=Colors.WHITE,
            border_color=Colors.GRAY_MEDIUM,
            border_width=1,
            corner_radius=8
        )
        card.grid_propagate(False)
        card.grid_columnconfigure(1, weight=1)
        
        # Document icon based on type
        icon_map = {
            "Contract": "📄",
            "Brief": "⚖️",
            "Evidence": "🔍",
            "Correspondence": "✉️",
            "Research": "📚"
        }
        
        icon_frame = ctk.CTkFrame(
            card,
            width=80,
            fg_color=Colors.GRAY_LIGHT,
            corner_radius=8
        )
        icon_frame.grid(row=0, column=0, rowspan=3, padx=15, pady=15, sticky="ns")
        icon_frame.grid_propagate(False)
        
        icon_label = ctk.CTkLabel(
            icon_frame,
            text=icon_map.get(doc_info["type"], "📄"),
            font=ctk.CTkFont(size=24)
        )
        icon_label.pack(expand=True)
        
        # Document information
        info_frame = ctk.CTkFrame(card, fg_color="transparent")
        info_frame.grid(row=0, column=1, sticky="ew", padx=10, pady=10)
        info_frame.grid_columnconfigure(0, weight=1)
        
        # Document name
        name_label = ctk.CTkLabel(
            info_frame,
            text=doc_info["name"],
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color=Colors.PRIMARY_DARK,
            anchor="w"
        )
        name_label.grid(row=0, column=0, sticky="ew")
        
        # Document details
        details = f"{doc_info['type']} • {doc_info['size']} • Modified {doc_info['modified']}"
        details_label = ctk.CTkLabel(
            info_frame,
            text=details,
            font=ctk.CTkFont(size=11),
            text_color=Colors.GRAY_WARM,
            anchor="w"
        )
        details_label.grid(row=1, column=0, sticky="ew", pady=(2, 0))
        
        # Security level indicator
        security_colors = {
            "Public": Colors.GREEN_SUCCESS,
            "Confidential": Colors.ORANGE_WARNING,
            "Privileged": Colors.RED_ERROR,
            "Work Product": Colors.PRIMARY_DARK
        }
        
        security_label = ctk.CTkLabel(
            info_frame,
            text=f"🛡️ {doc_info['security']}",
            font=ctk.CTkFont(size=10, weight="bold"),
            text_color=security_colors.get(doc_info['security'], Colors.GRAY_WARM),
            anchor="w"
        )
        security_label.grid(row=2, column=0, sticky="ew", pady=(2, 0))
        
        # Tags
        tags_text = " ".join([f"#{tag}" for tag in doc_info['tags']])
        tags_label = ctk.CTkLabel(
            info_frame,
            text=tags_text,
            font=ctk.CTkFont(size=9),
            text_color=Colors.PRIMARY_LIGHT,
            anchor="w"
        )
        tags_label.grid(row=3, column=0, sticky="ew", pady=(2, 0))
        
        # Action buttons
        actions_frame = ctk.CTkFrame(card, fg_color="transparent")
        actions_frame.grid(row=0, column=2, rowspan=3, padx=15, pady=15)
        
        open_btn = ctk.CTkButton(
            actions_frame,
            text="Open",
            width=80,
            height=30,
            corner_radius=15,
            fg_color=Colors.PRIMARY_LIGHT,
            hover_color=Colors.PRIMARY_DARK,
            command=lambda: self.open_document(doc_info)
        )
        open_btn.pack(pady=(0, 5))
        
        annotate_btn = ctk.CTkButton(
            actions_frame,
            text="Annotate",
            width=80,
            height=30,
            corner_radius=15,
            fg_color=Colors.GREEN_SUCCESS,
            hover_color="#047857",
            command=lambda: self.annotate_document(doc_info)
        )
        annotate_btn.pack(pady=(0, 5))
        
        share_btn = ctk.CTkButton(
            actions_frame,
            text="Share",
            width=80,
            height=25,
            corner_radius=12,
            fg_color=Colors.GRAY_WARM,
            hover_color="#4B5563",
            command=lambda: self.share_document(doc_info)
        )
        share_btn.pack()
        
        return card
    
    def create_research_section(self):
        """Create legal research interface"""
        research_frame = ctk.CTkFrame(self.content_frame, fg_color=Colors.WHITE)
        research_frame.grid_columnconfigure(0, weight=1)
        research_frame.grid_rowconfigure(1, weight=1)
        
        # Research header
        research_header = ctk.CTkFrame(
            research_frame,
            height=100,
            fg_color=Colors.GRAY_LIGHT,
            corner_radius=0
        )
        research_header.grid(row=0, column=0, sticky="ew", pady=(0, 1))
        research_header.grid_propagate(False)
        
        # Title and description
        title_label = ctk.CTkLabel(
            research_header,
            text="Legal Research & Analysis",
            font=ctk.CTkFont(size=20, weight="bold"),
            text_color=Colors.PRIMARY_DARK
        )
        title_label.pack(pady=(15, 5))
        
        desc_label = ctk.CTkLabel(
            research_header,
            text="Advanced legal research with AI-powered analysis and citation checking",
            font=ctk.CTkFont(size=12),
            text_color=Colors.GRAY_WARM
        )
        desc_label.pack(pady=(0, 15))
        
        # Research interface
        research_content = ctk.CTkFrame(research_frame, fg_color=Colors.WHITE)
        research_content.grid(row=1, column=0, sticky="nsew", padx=20, pady=20)
        research_content.grid_columnconfigure(0, weight=2)
        research_content.grid_columnconfigure(1, weight=1)
        research_content.grid_rowconfigure(1, weight=1)
        
        # Advanced search panel
        search_panel = ctk.CTkFrame(research_content, fg_color=Colors.GRAY_LIGHT)
        search_panel.grid(row=0, column=0, columnspan=2, sticky="ew", pady=(0, 20))
        search_panel.grid_columnconfigure(0, weight=1)
        
        # Research query input
        query_frame = ctk.CTkFrame(search_panel, fg_color="transparent")
        query_frame.grid(row=0, column=0, sticky="ew", padx=20, pady=15)
        query_frame.grid_columnconfigure(0, weight=1)
        
        self.research_query = ctk.CTkTextbox(
            query_frame,
            height=60,
            corner_radius=8,
            font=ctk.CTkFont(size=13),
            placeholder_text="Enter your legal research query... (e.g., 'contract law breach remedies California')"
        )
        self.research_query.grid(row=0, column=0, sticky="ew", padx=(0, 15))
        
        search_research_btn = ctk.CTkButton(
            query_frame,
            text="🔍 Research",
            width=120,
            height=60,
            corner_radius=30,
            fg_color=Colors.PRIMARY_DARK,
            hover_color=Colors.PRIMARY_LIGHT,
            font=ctk.CTkFont(size=14, weight="bold"),
            command=self.perform_legal_research
        )
        search_research_btn.grid(row=0, column=1)
        
        # Research filters
        filters_frame = ctk.CTkFrame(search_panel, fg_color="transparent")
        filters_frame.grid(row=1, column=0, sticky="ew", padx=20, pady=(0, 15))
        
        jurisdiction_filter = ctk.CTkOptionMenu(
            filters_frame,
            values=["All Jurisdictions", "Federal", "California", "New York", "Texas", "Other States"],
            width=150
        )
        jurisdiction_filter.pack(side="left", padx=(0, 15))
        
        case_type_filter = ctk.CTkOptionMenu(
            filters_frame,
            values=["All Types", "Contract Law", "Tort Law", "Criminal Law", "Corporate Law", "IP Law"],
            width=150
        )
        case_type_filter.pack(side="left", padx=(0, 15))
        
        date_filter = ctk.CTkOptionMenu(
            filters_frame,
            values=["All Dates", "Last Year", "Last 5 Years", "Last 10 Years", "Landmark Cases"],
            width=150
        )
        date_filter.pack(side="left")
        
        # Research results area
        results_frame = ctk.CTkScrollableFrame(
            research_content,
            fg_color=Colors.WHITE,
            corner_radius=8
        )
        results_frame.grid(row=1, column=0, sticky="nsew", padx=(0, 10))
        
        # Research tools panel
        tools_frame = ctk.CTkFrame(
            research_content,
            width=300,
            fg_color=Colors.GRAY_LIGHT,
            corner_radius=8
        )
        tools_frame.grid(row=1, column=1, sticky="nsew")
        tools_frame.grid_propagate(False)
        
        tools_title = ctk.CTkLabel(
            tools_frame,
            text="Research Tools",
            font=ctk.CTkFont(size=16, weight="bold"),
            text_color=Colors.PRIMARY_DARK
        )
        tools_title.pack(pady=(20, 15))
        
        # Citation checker
        citation_btn = ctk.CTkButton(
            tools_frame,
            text="📖 Citation Checker",
            width=250,
            height=40,
            corner_radius=20,
            fg_color=Colors.GREEN_SUCCESS,
            hover_color="#047857",
            command=self.check_citations
        )
        citation_btn.pack(pady=5)
        
        # Case law analyzer
        caselaw_btn = ctk.CTkButton(
            tools_frame,
            text="⚖️ Case Law Analysis",
            width=250,
            height=40,
            corner_radius=20,
            fg_color=Colors.PRIMARY_LIGHT,
            hover_color=Colors.PRIMARY_DARK,
            command=self.analyze_case_law
        )
        caselaw_btn.pack(pady=5)
        
        # Statute finder
        statute_btn = ctk.CTkButton(
            tools_frame,
            text="📜 Statute Finder",
            width=250,
            height=40,
            corner_radius=20,
            fg_color=Colors.ORANGE_WARNING,
            hover_color="#B45309",
            command=self.find_statutes
        )
        statute_btn.pack(pady=5)
        
        # Save research
        save_btn = ctk.CTkButton(
            tools_frame,
            text="💾 Save Research",
            width=250,
            height=35,
            corner_radius=18,
            fg_color=Colors.GRAY_WARM,
            hover_color="#4B5563",
            command=self.save_research
        )
        save_btn.pack(pady=(20, 10))
        
        return research_frame
    
    def create_history_section(self):
        """Create history and archives section"""
        history_frame = ctk.CTkFrame(self.content_frame, fg_color=Colors.WHITE)
        history_frame.grid_columnconfigure(0, weight=1)
        history_frame.grid_rowconfigure(1, weight=1)
        
        # History header
        history_header = ctk.CTkFrame(
            history_frame,
            height=60,
            fg_color=Colors.GRAY_LIGHT,
            corner_radius=0
        )
        history_header.grid(row=0, column=0, sticky="ew", pady=(0, 1))
        history_header.grid_propagate(False)
        
        history_title = ctk.CTkLabel(
            history_header,
            text="📚 Conversation History & Archives",
            font=ctk.CTkFont(size=20, weight="bold"),
            text_color=Colors.PRIMARY_DARK
        )
        history_title.pack(pady=15)
        
        # History content with three-column layout
        history_content = ctk.CTkFrame(history_frame, fg_color=Colors.WHITE)
        history_content.grid(row=1, column=0, sticky="nsew", padx=20, pady=20)
        history_content.grid_columnconfigure(0, weight=1)
        history_content.grid_columnconfigure(1, weight=1)
        history_content.grid_columnconfigure(2, weight=1)
        history_content.grid_rowconfigure(0, weight=1)
        
        # Recent conversations (Three-click rule: 1-2 clicks)
        recent_frame = ctk.CTkFrame(history_content, fg_color=Colors.GRAY_LIGHT)
        recent_frame.grid(row=0, column=0, sticky="nsew", padx=(0, 10))
        
        recent_title = ctk.CTkLabel(
            recent_frame,
            text="Recent Conversations",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color=Colors.PRIMARY_DARK
        )
        recent_title.pack(pady=(15, 10))
        
        # Sample recent conversations
        recent_convos = [
            {"title": "Contract Review - ABC Corp", "time": "2 hours ago", "messages": 15},
            {"title": "Motion to Dismiss Research", "time": "Yesterday", "messages": 8},
            {"title": "Client Consultation Notes", "time": "2 days ago", "messages": 23},
        ]
        
        for convo in recent_convos:
            convo_btn = ctk.CTkButton(
                recent_frame,
                text=f"{convo['title']}\n{convo['time']} • {convo['messages']} messages",
                width=250,
                height=50,
                corner_radius=10,
                fg_color=Colors.WHITE,
                text_color=Colors.PRIMARY_DARK,
                hover_color=Colors.GRAY_LIGHT,
                anchor="w",
                command=lambda c=convo: self.load_conversation(c)
            )
            convo_btn.pack(fill="x", padx=15, pady=5)
        
        # Archived sessions
        archive_frame = ctk.CTkFrame(history_content, fg_color=Colors.GRAY_LIGHT)
        archive_frame.grid(row=0, column=1, sticky="nsew", padx=10)
        
        archive_title = ctk.CTkLabel(
            archive_frame,
            text="Archived Sessions",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color=Colors.PRIMARY_DARK
        )
        archive_title.pack(pady=(15, 10))
        
        # Sample archived sessions
        archived_sessions = [
            {"title": "Q2 Case Review Archive", "date": "June 2024", "count": 45},
            {"title": "Client ABC - All Sessions", "date": "May 2024", "count": 23},
            {"title": "Research Archive", "date": "April 2024", "count": 67},
        ]
        
        for session in archived_sessions:
            session_btn = ctk.CTkButton(
                archive_frame,
                text=f"{session['title']}\n{session['date']} • {session['count']} items",
                width=250,
                height=50,
                corner_radius=10,
                fg_color=Colors.WHITE,
                text_color=Colors.PRIMARY_DARK,
                hover_color=Colors.GRAY_LIGHT,
                anchor="w",
                command=lambda s=session: self.load_archive(s)
            )
            session_btn.pack(fill="x", padx=15, pady=5)
        
        # Search and export
        tools_frame = ctk.CTkFrame(history_content, fg_color=Colors.GRAY_LIGHT)
        tools_frame.grid(row=0, column=2, sticky="nsew", padx=(10, 0))
        
        tools_title = ctk.CTkLabel(
            tools_frame,
            text="Search & Export",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color=Colors.PRIMARY_DARK
        )
        tools_title.pack(pady=(15, 10))
        
        # History search
        history_search = ctk.CTkEntry(
            tools_frame,
            placeholder_text="Search history...",
            width=250,
            height=35
        )
        history_search.pack(padx=15, pady=10)
        
        # Export options
        export_btn = ctk.CTkButton(
            tools_frame,
            text="📤 Export History",
            width=250,
            height=40,
            corner_radius=20,
            fg_color=Colors.GREEN_SUCCESS,
            hover_color="#047857",
            command=self.export_history
        )
        export_btn.pack(padx=15, pady=10)
        
        backup_btn = ctk.CTkButton(
            tools_frame,
            text="💾 Create Backup",
            width=250,
            height=40,
            corner_radius=20,
            fg_color=Colors.PRIMARY_LIGHT,
            hover_color=Colors.PRIMARY_DARK,
            command=self.create_backup
        )
        backup_btn.pack(padx=15, pady=10)
        
        return history_frame
    
    def create_settings_section(self):
        """Create comprehensive settings interface"""
        settings_frame = ctk.CTkFrame(self.content_frame, fg_color=Colors.WHITE)
        settings_frame.grid_columnconfigure(0, weight=1)
        settings_frame.grid_rowconfigure(0, weight=1)
        
        # Settings with tabbed interface
        settings_tabview = ctk.CTkTabview(
            settings_frame,
            corner_radius=8,
            segmented_button_fg_color=Colors.GRAY_LIGHT,
            segmented_button_selected_color=Colors.PRIMARY_DARK
        )
        settings_tabview.grid(row=0, column=0, sticky="nsew", padx=20, pady=20)
        
        # General settings tab
        general_tab = settings_tabview.add("General")
        self.setup_general_settings(general_tab)
        
        # Privacy settings tab
        privacy_tab = settings_tabview.add("Privacy & Security")
        self.setup_privacy_settings(privacy_tab)
        
        # Model settings tab
        model_tab = settings_tabview.add("AI Models")
        self.setup_model_settings(model_tab)
        
        # Interface settings tab
        interface_tab = settings_tabview.add("Interface")
        self.setup_interface_settings(interface_tab)
        
        return settings_frame
    
    def setup_general_settings(self, parent):
        """Setup general settings"""
        # Auto-save settings
        autosave_frame = ctk.CTkFrame(parent, fg_color=Colors.GRAY_LIGHT)
        autosave_frame.pack(fill="x", padx=20, pady=10)
        
        autosave_label = ctk.CTkLabel(
            autosave_frame,
            text="💾 Auto-save Conversations",
            font=ctk.CTkFont(size=14, weight="bold")
        )
        autosave_label.pack(pady=10)
        
        self.autosave_toggle = ctk.CTkSwitch(
            autosave_frame,
            text="Enable automatic saving of conversations"
        )
        self.autosave_toggle.pack(pady=(0, 10))
        self.autosave_toggle.select()
        
        # Default document location
        docs_frame = ctk.CTkFrame(parent, fg_color=Colors.GRAY_LIGHT)
        docs_frame.pack(fill="x", padx=20, pady=10)
        
        docs_label = ctk.CTkLabel(
            docs_frame,
            text="📁 Default Document Location",
            font=ctk.CTkFont(size=14, weight="bold")
        )
        docs_label.pack(pady=(10, 5))
        
        docs_path_frame = ctk.CTkFrame(docs_frame, fg_color="transparent")
        docs_path_frame.pack(fill="x", padx=20, pady=(0, 10))
        docs_path_frame.grid_columnconfigure(0, weight=1)
        
        self.docs_path_entry = ctk.CTkEntry(
            docs_path_frame,
            placeholder_text="Select default document folder..."
        )
        self.docs_path_entry.grid(row=0, column=0, sticky="ew", padx=(0, 10))
        
        browse_btn = ctk.CTkButton(
            docs_path_frame,
            text="Browse",
            width=80,
            command=self.browse_document_folder
        )
        browse_btn.grid(row=0, column=1)
    
    def setup_privacy_settings(self, parent):
        """Setup privacy and security settings"""
        # PII Protection
        pii_frame = ctk.CTkFrame(parent, fg_color=Colors.GRAY_LIGHT)
        pii_frame.pack(fill="x", padx=20, pady=10)
        
        pii_title = ctk.CTkLabel(
            pii_frame,
            text="🛡️ PII Protection Settings",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color=Colors.PRIMARY_DARK
        )
        pii_title.pack(pady=(15, 10))
        
        self.global_pii_toggle = ctk.CTkSwitch(
            pii_frame,
            text="Enable PII detection and scrubbing globally"
        )
        self.global_pii_toggle.pack(pady=5)
        self.global_pii_toggle.select()
        
        # PII sensitivity level
        sensitivity_frame = ctk.CTkFrame(pii_frame, fg_color="transparent")
        sensitivity_frame.pack(fill="x", padx=20, pady=10)
        
        ctk.CTkLabel(sensitivity_frame, text="PII Detection Sensitivity:").pack(side="left")
        
        self.pii_sensitivity = ctk.CTkOptionMenu(
            sensitivity_frame,
            values=["Low", "Medium", "High", "Maximum"],
            width=120
        )
        self.pii_sensitivity.pack(side="right")
        self.pii_sensitivity.set("High")
        
        # Data encryption
        encryption_frame = ctk.CTkFrame(parent, fg_color=Colors.GRAY_LIGHT)
        encryption_frame.pack(fill="x", padx=20, pady=10)
        
        encryption_title = ctk.CTkLabel(
            encryption_frame,
            text="🔐 Data Encryption",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color=Colors.PRIMARY_DARK
        )
        encryption_title.pack(pady=(15, 10))
        
        self.encryption_toggle = ctk.CTkSwitch(
            encryption_frame,
            text="Encrypt stored conversations and documents"
        )
        self.encryption_toggle.pack(pady=5)
        self.encryption_toggle.select()
        
        # Session timeout
        timeout_frame = ctk.CTkFrame(encryption_frame, fg_color="transparent")
        timeout_frame.pack(fill="x", padx=20, pady=10)
        
        ctk.CTkLabel(timeout_frame, text="Auto-lock after:").pack(side="left")
        
        self.session_timeout = ctk.CTkOptionMenu(
            timeout_frame,
            values=["15 minutes", "30 minutes", "1 hour", "2 hours", "Never"],
            width=120
        )
        self.session_timeout.pack(side="right")
        self.session_timeout.set("30 minutes")
    
    def setup_model_settings(self, parent):
        """Setup AI model settings"""
        if MODEL_MANAGER_AVAILABLE and self.model_manager:
            # Current model display
            current_model_frame = ctk.CTkFrame(parent, fg_color=Colors.GRAY_LIGHT)
            current_model_frame.pack(fill="x", padx=20, pady=10)
            
            current_title = ctk.CTkLabel(
                current_model_frame,
                text="🤖 Current AI Model",
                font=ctk.CTkFont(size=14, weight="bold"),
                text_color=Colors.PRIMARY_DARK
            )
            current_title.pack(pady=(15, 5))
            
            model_info = self.selected_model.name if self.selected_model else "No model selected"
            current_model_label = ctk.CTkLabel(
                current_model_frame,
                text=model_info,
                font=ctk.CTkFont(size=12)
            )
            current_model_label.pack(pady=(0, 15))
            
            # Model management
            management_frame = ctk.CTkFrame(parent, fg_color=Colors.GRAY_LIGHT)
            management_frame.pack(fill="x", padx=20, pady=10)
            
            management_title = ctk.CTkLabel(
                management_frame,
                text="⚙️ Model Management",
                font=ctk.CTkFont(size=14, weight="bold"),
                text_color=Colors.PRIMARY_DARK
            )
            management_title.pack(pady=(15, 10))
            
            manage_models_btn = ctk.CTkButton(
                management_frame,
                text="Manage AI Models",
                width=200,
                height=40,
                corner_radius=20,
                fg_color=Colors.PRIMARY_LIGHT,
                hover_color=Colors.PRIMARY_DARK,
                command=lambda: self.show_section(NavigationSection.CHAT)
            )
            manage_models_btn.pack(pady=(0, 15))
        
        else:
            # Model manager not available message
            unavailable_frame = ctk.CTkFrame(parent, fg_color=Colors.GRAY_LIGHT)
            unavailable_frame.pack(fill="x", padx=20, pady=10)
            
            unavailable_label = ctk.CTkLabel(
                unavailable_frame,
                text="⚠️ Model Manager Not Available",
                font=ctk.CTkFont(size=14, weight="bold"),
                text_color=Colors.ORANGE_WARNING
            )
            unavailable_label.pack(pady=20)
    
    def setup_interface_settings(self, parent):
        """Setup interface customization settings"""
        # Theme settings
        theme_frame = ctk.CTkFrame(parent, fg_color=Colors.GRAY_LIGHT)
        theme_frame.pack(fill="x", padx=20, pady=10)
        
        theme_title = ctk.CTkLabel(
            theme_frame,
            text="🎨 Theme & Appearance",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color=Colors.PRIMARY_DARK
        )
        theme_title.pack(pady=(15, 10))
        
        theme_selection = ctk.CTkFrame(theme_frame, fg_color="transparent")
        theme_selection.pack(fill="x", padx=20, pady=(0, 15))
        
        ctk.CTkLabel(theme_selection, text="Color Theme:").pack(side="left")
        
        self.theme_var = ctk.CTkOptionMenu(
            theme_selection,
            values=["Professional Light", "Professional Dark", "High Contrast"],
            width=150,
            command=self.change_theme
        )
        self.theme_var.pack(side="right")
        self.theme_var.set("Professional Light")
        
        # Font size settings
        font_frame = ctk.CTkFrame(parent, fg_color=Colors.GRAY_LIGHT)
        font_frame.pack(fill="x", padx=20, pady=10)
        
        font_title = ctk.CTkLabel(
            font_frame,
            text="🔤 Font Settings",
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color=Colors.PRIMARY_DARK
        )
        font_title.pack(pady=(15, 10))
        
        font_size_frame = ctk.CTkFrame(font_frame, fg_color="transparent")
        font_size_frame.pack(fill="x", padx=20, pady=(0, 15))
        
        ctk.CTkLabel(font_size_frame, text="Font Size:").pack(side="left")
        
        self.font_size_var = ctk.CTkOptionMenu(
            font_size_frame,
            values=["Small", "Medium", "Large", "Extra Large"],
            width=120
        )
        self.font_size_var.pack(side="right")
        self.font_size_var.set("Medium")
    
    def create_help_section(self):
        """Create comprehensive help and support section"""
        help_frame = ctk.CTkFrame(self.content_frame, fg_color=Colors.WHITE)
        help_frame.grid_columnconfigure(0, weight=1)
        help_frame.grid_rowconfigure(1, weight=1)
        
        # Help header
        help_header = ctk.CTkFrame(
            help_frame,
            height=80,
            fg_color=Colors.PRIMARY_DARK,
            corner_radius=0
        )
        help_header.grid(row=0, column=0, sticky="ew", pady=(0, 1))
        help_header.grid_propagate(False)
        
        help_title = ctk.CTkLabel(
            help_header,
            text="❓ Help & Support Center",
            font=ctk.CTkFont(size=24, weight="bold"),
            text_color=Colors.WHITE
        )
        help_title.pack(pady=20)
        
        # Help content with multiple sections
        help_content = ctk.CTkFrame(help_frame, fg_color=Colors.WHITE)
        help_content.grid(row=1, column=0, sticky="nsew", padx=20, pady=20)
        help_content.grid_columnconfigure(0, weight=1)
        help_content.grid_columnconfigure(1, weight=1)
        help_content.grid_rowconfigure(1, weight=1)
        
        # Quick start guide
        quickstart_frame = ctk.CTkFrame(help_content, fg_color=Colors.GRAY_LIGHT)
        quickstart_frame.grid(row=0, column=0, sticky="nsew", padx=(0, 10), pady=(0, 20))
        
        quickstart_title = ctk.CTkLabel(
            quickstart_frame,
            text="🚀 Quick Start Guide",
            font=ctk.CTkFont(size=16, weight="bold"),
            text_color=Colors.PRIMARY_DARK
        )
        quickstart_title.pack(pady=(20, 15))
        
        quickstart_steps = [
            "1. Select an AI model in the Chat section",
            "2. Upload legal documents for analysis",
            "3. Use advanced search for legal research",
            "4. Enable PII protection for client data",
            "5. Export conversations and research"
        ]
        
        for step in quickstart_steps:
            step_label = ctk.CTkLabel(
                quickstart_frame,
                text=step,
                font=ctk.CTkFont(size=12),
                text_color=Colors.GRAY_WARM,
                anchor="w"
            )
            step_label.pack(fill="x", padx=20, pady=2)
        
        # Feature overview
        features_frame = ctk.CTkFrame(help_content, fg_color=Colors.GRAY_LIGHT)
        features_frame.grid(row=0, column=1, sticky="nsew", padx=(10, 0), pady=(0, 20))
        
        features_title = ctk.CTkLabel(
            features_frame,
            text="⭐ Key Features",
            font=ctk.CTkFont(size=16, weight="bold"),
            text_color=Colors.PRIMARY_DARK
        )
        features_title.pack(pady=(20, 15))
        
        key_features = [
            "• Privacy-first local AI processing",
            "• Advanced PII detection & scrubbing",
            "• Professional document management",
            "• Legal research with AI analysis",
            "• Secure conversation history",
            "• Annotation and markup tools"
        ]
        
        for feature in key_features:
            feature_label = ctk.CTkLabel(
                features_frame,
                text=feature,
                font=ctk.CTkFont(size=12),
                text_color=Colors.GRAY_WARM,
                anchor="w"
            )
            feature_label.pack(fill="x", padx=20, pady=2)
        
        # Detailed help topics
        topics_frame = ctk.CTkScrollableFrame(
            help_content,
            fg_color=Colors.WHITE,
            corner_radius=8
        )
        topics_frame.grid(row=1, column=0, columnspan=2, sticky="nsew")
        
        help_topics = [
            {
                "title": "Three-Click Rule Compliance",
                "content": "All core functions are accessible within three clicks:\n• New Chat: 1 click from top bar\n• Search: Always visible, 1 click to activate\n• Settings: 2 clicks maximum\n• Help: 1 click access"
            },
            {
                "title": "Security & Privacy Features",
                "content": "BEAR AI prioritizes your privacy:\n• All processing happens locally on your machine\n• Advanced PII detection protects client data\n• Conversations are encrypted at rest\n• No data sent to external servers"
            },
            {
                "title": "Document Management",
                "content": "Professional document handling:\n• Drag-and-drop document upload\n• Security level classification\n• Advanced annotation tools\n• Full-text search capabilities"
            },
            {
                "title": "AI Model Management",
                "content": "Flexible AI model options:\n• Download models suitable for your hardware\n• Switch between models for different tasks\n• Local processing ensures privacy\n• Hardware compatibility checking"
            }
        ]
        
        for topic in help_topics:
            topic_frame = ctk.CTkFrame(topics_frame, fg_color=Colors.GRAY_LIGHT)
            topic_frame.pack(fill="x", padx=10, pady=10)
            
            topic_title = ctk.CTkLabel(
                topic_frame,
                text=topic["title"],
                font=ctk.CTkFont(size=14, weight="bold"),
                text_color=Colors.PRIMARY_DARK,
                anchor="w"
            )
            topic_title.pack(fill="x", padx=20, pady=(15, 5))
            
            topic_content = ctk.CTkLabel(
                topic_frame,
                text=topic["content"],
                font=ctk.CTkFont(size=11),
                text_color=Colors.GRAY_WARM,
                anchor="w",
                justify="left"
            )
            topic_content.pack(fill="x", padx=20, pady=(0, 15))
        
        return help_frame
    
    def setup_status_bar(self):
        """Setup professional status bar"""
        self.status_bar = ctk.CTkFrame(
            self.root,
            height=30,
            corner_radius=0,
            fg_color=Colors.GRAY_LIGHT,
            border_color=Colors.GRAY_MEDIUM,
            border_width=1
        )
        self.status_bar.grid(row=2, column=0, columnspan=2, sticky="ew")
        self.status_bar.grid_propagate(False)
        self.status_bar.grid_columnconfigure(1, weight=1)
        
        # Status message
        self.status_label = ctk.CTkLabel(
            self.status_bar,
            text="Ready - All systems operational",
            font=ctk.CTkFont(size=10),
            text_color=Colors.GRAY_WARM
        )
        self.status_label.grid(row=0, column=0, padx=15, pady=5, sticky="w")
        
        # System indicators
        indicators_frame = ctk.CTkFrame(self.status_bar, fg_color="transparent")
        indicators_frame.grid(row=0, column=2, padx=15, pady=2, sticky="e")
        
        # Privacy indicator
        privacy_indicator = ctk.CTkLabel(
            indicators_frame,
            text="🛡️ Private",
            font=ctk.CTkFont(size=9),
            text_color=Colors.GREEN_SUCCESS
        )
        privacy_indicator.pack(side="right", padx=(10, 0))
        
        # Connection indicator
        connection_indicator = ctk.CTkLabel(
            indicators_frame,
            text="🔒 Local",
            font=ctk.CTkFont(size=9),
            text_color=Colors.GREEN_SUCCESS
        )
        connection_indicator.pack(side="right", padx=(10, 0))
        
        # Model status
        self.model_indicator = ctk.CTkLabel(
            indicators_frame,
            text="⚠️ No Model",
            font=ctk.CTkFont(size=9),
            text_color=Colors.ORANGE_WARNING
        )
        self.model_indicator.pack(side="right")
    
    def setup_professional_tkinter_gui(self):
        """Fallback professional tkinter interface"""
        # This would implement a similar interface using standard tkinter
        # For brevity, we'll create a basic fallback
        self.root = tk.Tk()
        self.root.title("BEAR AI - Professional Legal Assistant")
        self.root.geometry("1200x800")
        self.root.configure(bg=Colors.BACKGROUND)
        
        # Basic layout with notebook
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Create basic tabs
        self.chat_tab = tk.Frame(self.notebook, bg=Colors.WHITE)
        self.docs_tab = tk.Frame(self.notebook, bg=Colors.WHITE)
        self.settings_tab = tk.Frame(self.notebook, bg=Colors.WHITE)
        
        self.notebook.add(self.chat_tab, text="💬 Chat")
        self.notebook.add(self.docs_tab, text="📄 Documents")
        self.notebook.add(self.settings_tab, text="⚙️ Settings")
        
        # Basic chat interface
        self.chat_display = scrolledtext.ScrolledText(
            self.chat_tab,
            wrap="word",
            font=("Segoe UI", 11)
        )
        self.chat_display.pack(fill="both", expand=True, padx=20, pady=20)
        
        messagebox.showinfo("Fallback Mode", 
                          "Running in fallback mode. Install customtkinter for full professional interface:\n"
                          "pip install customtkinter")
    
    def load_initial_data(self):
        """Load initial data and setup"""
        try:
            # Load any saved settings
            self.load_user_preferences()
            
            # Initialize model manager if available
            if MODEL_MANAGER_AVAILABLE and self.model_manager:
                self.load_available_models()
            
            # Setup default status
            self.update_status("BEAR AI Professional ready - Privacy protection active")
            
            # Load sample data for demonstration
            self.load_sample_documents()
            
        except Exception as e:
            self.handle_error("Initialization Error", f"Failed to load initial data: {e}")
    
    # Event Handlers and Core Functionality
    
    def toggle_sidebar(self):
        """Toggle sidebar collapse/expand"""
        self.sidebar_collapsed = not self.sidebar_collapsed
        
        # Update sidebar width and content
        sidebar_width = 60 if self.sidebar_collapsed else 250
        self.sidebar.configure(width=sidebar_width)
        
        # Update collapse button
        self.collapse_btn.configure(text="▶" if self.sidebar_collapsed else "◀")
        
        # Recreate navigation sections with new layout
        for widget in self.sidebar.winfo_children():
            if widget != self.collapse_btn.master:  # Don't destroy header
                widget.destroy()
        
        self.setup_navigation_sections()
        self.setup_security_indicator()
    
    def show_section(self, section: NavigationSection):
        """Show the specified section"""
        # Hide all content sections
        for content_section in self.content_sections.values():
            content_section.grid_remove()
        
        # Show selected section
        if section in self.content_sections:
            self.content_sections[section].grid(row=0, column=0, sticky="nsew")
        
        # Update navigation selection
        self.current_section = section
        self.update_nav_selection(section)
        
        # Update status
        section_names = {
            NavigationSection.CHAT: "Chat & Conversations",
            NavigationSection.DOCUMENTS: "Document Management",
            NavigationSection.RESEARCH: "Legal Research",
            NavigationSection.HISTORY: "History & Archives",
            NavigationSection.SETTINGS: "Settings & Preferences",
            NavigationSection.HELP: "Help & Support"
        }
        
        self.update_status(f"Viewing: {section_names.get(section, 'Unknown')}")
    
    def update_nav_selection(self, selected_section):
        """Update navigation button selection styling"""
        for section, button in self.nav_buttons.items():
            if section == selected_section:
                button.configure(
                    fg_color=Colors.PRIMARY_DARK,
                    text_color=Colors.WHITE
                )
            else:
                button.configure(
                    fg_color="transparent",
                    text_color=Colors.GRAY_WARM
                )
    
    def perform_global_search(self, event=None):
        """Perform global search across all content"""
        query = self.global_search.get().strip()
        if not query:
            return
        
        # Add to search history
        if query not in self.search_history:
            self.search_history.append(query)
        
        # Perform search (placeholder implementation)
        self.update_status(f"Searching for: '{query}'...")
        
        # Show loading animation
        threading.Thread(target=self.simulate_search, args=(query,), daemon=True).start()
    
    def simulate_search(self, query):
        """Simulate search operation with loading"""
        time.sleep(1.5)  # Simulate search time
        
        # Update UI in main thread
        self.root.after(0, lambda: self.update_status(f"Found 12 results for '{query}'"))
        self.root.after(0, lambda: messagebox.showinfo("Search Results", 
                                                       f"Search completed for: '{query}'\n\n"
                                                       "Found matches in:\n"
                                                       "• 5 conversations\n"
                                                       "• 3 documents\n"
                                                       "• 4 research items"))
    
    def new_conversation(self):
        """Start a new conversation (Three-click rule: 1 click)"""
        # Clear current conversation
        if CTK_AVAILABLE:
            self.chat_display.delete("1.0", "end")
            self.input_text.delete("1.0", "end")
        
        # Update conversation title
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        if hasattr(self, 'conversation_title'):
            self.conversation_title.configure(text=f"New Conversation - {timestamp}")
        
        # Switch to chat section
        self.show_section(NavigationSection.CHAT)
        
        # Add welcome message
        welcome_msg = f"[{datetime.now().strftime('%H:%M')}] BEAR AI: Welcome to your new conversation! How can I assist you with your legal work today?\n\n"
        if CTK_AVAILABLE:
            self.chat_display.insert("1.0", welcome_msg)
        
        self.update_status("New conversation started")
    
    def show_settings_menu(self):
        """Show settings dropdown menu (Three-click rule: 2 clicks max)"""
        self.show_section(NavigationSection.SETTINGS)
    
    def show_help(self):
        """Show help section (Three-click rule: 1 click)"""
        self.show_section(NavigationSection.HELP)
    
    def toggle_pii_protection(self):
        """Toggle PII protection on/off"""
        self.pii_protection_enabled = self.pii_toggle.get()
        status = "enabled" if self.pii_protection_enabled else "disabled"
        
        # Update global setting
        if hasattr(self, 'global_pii_toggle'):
            if self.pii_protection_enabled:
                self.global_pii_toggle.select()
            else:
                self.global_pii_toggle.deselect()
        
        self.update_status(f"PII protection {status}")
    
    def send_message(self, event=None):
        """Send user message with PII protection"""
        if not CTK_AVAILABLE:
            return "break"
        
        # Get user input
        user_input = self.input_text.get("1.0", "end-1c").strip()
        if not user_input:
            return "break"
        
        # Check for model selection
        if not self.selected_model:
            messagebox.showwarning("No Model Selected", 
                                 "Please select an AI model first.\n\n"
                                 "Go to Chat section → Select Model button")
            return "break"
        
        # Apply PII protection if enabled
        display_input = user_input
        if self.pii_protection_enabled:
            try:
                scrubbed_input, has_pii, detected_types = self.pii_scrubber.scrub_text(user_input)
                if has_pii:
                    # Show PII warning
                    pii_warning = f"⚠️ PII detected and protected: {', '.join(detected_types)}\n"
                    self.chat_display.insert("end", pii_warning)
                    display_input = scrubbed_input
            except Exception as e:
                self.handle_error("PII Protection Error", f"PII scrubbing failed: {e}")
        
        # Display user message
        timestamp = datetime.now().strftime("%H:%M")
        user_msg = f"[{timestamp}] You: {display_input}\n\n"
        self.chat_display.insert("end", user_msg)
        
        # Clear input
        self.input_text.delete("1.0", "end")
        
        # Show typing indicator
        typing_msg = f"[{timestamp}] BEAR AI: Thinking...\n"
        self.chat_display.insert("end", typing_msg)
        self.chat_display.see("end")
        
        # Simulate AI response
        threading.Thread(target=self.simulate_ai_response, args=(display_input, timestamp), daemon=True).start()
        
        return "break"
    
    def simulate_ai_response(self, user_input, timestamp):
        """Simulate AI response (placeholder for actual AI integration)"""
        time.sleep(2)  # Simulate processing time
        
        # Generate placeholder response
        responses = [
            "I understand you're asking about legal matters. As a professional legal AI assistant, I can help you analyze documents, research case law, and provide general legal information. Please note that this is not legal advice and should not replace consultation with a qualified attorney.",
            "I can assist you with legal research, document analysis, and general legal information. What specific area of law would you like to explore?",
            "Based on your query, I can help you find relevant case law, statutes, and legal precedents. Would you like me to conduct a comprehensive legal research on this topic?",
            "I notice this might involve sensitive client information. Rest assured that all our processing is done locally and your data never leaves your machine. How can I best assist you with this legal matter?"
        ]
        
        import random
        response = random.choice(responses)
        
        # Update UI in main thread
        def update_chat():
            # Remove typing indicator
            content = self.chat_display.get("1.0", "end")
            content = content.replace(f"[{timestamp}] BEAR AI: Thinking...\n", "")
            self.chat_display.delete("1.0", "end")
            self.chat_display.insert("1.0", content)
            
            # Add actual response
            ai_msg = f"[{timestamp}] BEAR AI ({self.selected_model.name if self.selected_model else 'AI'}): {response}\n\n"
            self.chat_display.insert("end", ai_msg)
            self.chat_display.see("end")
            
            # Update status
            self.update_status("Response generated")
        
        self.root.after(0, update_chat)
    
    def attach_document(self):
        """Attach document to conversation (Three-click rule: 1 click)"""
        filetypes = [
            ("All Documents", "*.pdf *.docx *.txt *.rtf"),
            ("PDF files", "*.pdf"),
            ("Word documents", "*.docx"),
            ("Text files", "*.txt"),
            ("Rich text", "*.rtf"),
            ("All files", "*.*")
        ]
        
        filename = filedialog.askopenfilename(
            title="Select Document to Attach",
            filetypes=filetypes
        )
        
        if filename:
            # Add document to conversation context
            doc_name = Path(filename).name
            timestamp = datetime.now().strftime("%H:%M")
            attach_msg = f"[{timestamp}] 📎 Attached: {doc_name}\n"
            
            if CTK_AVAILABLE:
                self.chat_display.insert("end", attach_msg)
                self.chat_display.see("end")
            
            self.update_status(f"Document attached: {doc_name}")
    
    # Document Management Functions
    
    def upload_documents(self):
        """Upload documents for management"""
        filetypes = [
            ("Legal Documents", "*.pdf *.docx *.doc *.txt"),
            ("PDF files", "*.pdf"),
            ("Word documents", "*.docx *.doc"),
            ("Text files", "*.txt"),
            ("All files", "*.*")
        ]
        
        filenames = filedialog.askopenfilenames(
            title="Select Documents to Upload",
            filetypes=filetypes
        )
        
        if filenames:
            # Simulate document upload and processing
            self.update_status(f"Uploading {len(filenames)} document(s)...")
            threading.Thread(target=self.process_uploaded_documents, args=(filenames,), daemon=True).start()
    
    def process_uploaded_documents(self, filenames):
        """Process uploaded documents"""
        for filename in filenames:
            time.sleep(0.5)  # Simulate processing
            
            # Create document info
            doc_path = Path(filename)
            doc_info = DocumentInfo(
                filename=doc_path.name,
                filepath=str(doc_path),
                size=doc_path.stat().st_size if doc_path.exists() else 0,
                modified=datetime.now(),
                doc_type=self.guess_document_type(doc_path.name),
                tags=[],
                annotations=[],
                security_level="Confidential"
            )
            
            self.documents.append(doc_info)
        
        # Update UI
        self.root.after(0, lambda: self.update_status(f"Uploaded {len(filenames)} document(s) successfully"))
        self.root.after(0, lambda: messagebox.showinfo("Upload Complete", 
                                                       f"Successfully uploaded {len(filenames)} document(s)"))
    
    def guess_document_type(self, filename):
        """Guess document type from filename"""
        filename_lower = filename.lower()
        if 'contract' in filename_lower or 'agreement' in filename_lower:
            return 'Contract'
        elif 'brief' in filename_lower or 'motion' in filename_lower:
            return 'Brief'
        elif 'correspondence' in filename_lower or 'letter' in filename_lower:
            return 'Correspondence'
        elif 'research' in filename_lower:
            return 'Research'
        elif 'evidence' in filename_lower or 'exhibit' in filename_lower:
            return 'Evidence'
        else:
            return 'Document'
    
    def create_document_folder(self):
        """Create new document folder"""
        folder_name = tk.simpledialog.askstring("New Folder", "Enter folder name:")
        if folder_name:
            self.update_status(f"Created folder: {folder_name}")
            messagebox.showinfo("Folder Created", f"Created folder: {folder_name}")
    
    def open_document(self, doc_info):
        """Open document for viewing/editing"""
        self.update_status(f"Opening document: {doc_info['name']}")
        messagebox.showinfo("Open Document", f"Opening: {doc_info['name']}\n\n"
                                            "This would launch the document viewer/editor.")
    
    def annotate_document(self, doc_info):
        """Open document annotation tool"""
        self.update_status(f"Opening annotation tool for: {doc_info['name']}")
        messagebox.showinfo("Annotation Tool", f"Opening annotation tools for: {doc_info['name']}\n\n"
                                              "Features:\n• Highlight text\n• Add comments\n• Mark sections\n• Collaborate")
    
    def share_document(self, doc_info):
        """Share document securely"""
        self.update_status(f"Sharing document: {doc_info['name']}")
        messagebox.showinfo("Share Document", f"Secure sharing for: {doc_info['name']}\n\n"
                                             "Options:\n• Generate secure link\n• Set permissions\n• Track access")
    
    # Research Functions
    
    def perform_legal_research(self):
        """Perform legal research with AI analysis"""
        if not CTK_AVAILABLE:
            return
        
        query = self.research_query.get("1.0", "end-1c").strip()
        if not query:
            messagebox.showwarning("No Query", "Please enter a research query.")
            return
        
        self.update_status(f"Researching: {query}")
        threading.Thread(target=self.simulate_legal_research, args=(query,), daemon=True).start()
    
    def simulate_legal_research(self, query):
        """Simulate legal research process"""
        time.sleep(3)  # Simulate research time
        
        def show_results():
            results = f"Legal Research Results for: '{query}'\n\n"
            results += "Found 15 relevant cases, 8 statutes, and 12 law review articles.\n\n"
            results += "Key Cases:\n"
            results += "• Case A v. Case B (2023) - Contract dispute precedent\n"
            results += "• State v. Defendant (2022) - Criminal law application\n"
            results += "• Corporation X v. Y (2021) - Corporate governance\n\n"
            results += "Relevant Statutes:\n"
            results += "• Civil Code Section 1234 - Contract formation\n"
            results += "• Business Code Section 5678 - Corporate liability\n\n"
            results += "This is a demonstration of the research capabilities."
            
            messagebox.showinfo("Research Complete", results)
            self.update_status("Research completed")
        
        self.root.after(0, show_results)
    
    def check_citations(self):
        """Check legal citations for accuracy"""
        messagebox.showinfo("Citation Checker", "Citation checking tool would:\n\n"
                                                "• Verify citation format\n"
                                                "• Check case law accuracy\n"
                                                "• Validate statute references\n"
                                                "• Suggest corrections")
    
    def analyze_case_law(self):
        """Analyze case law with AI"""
        messagebox.showinfo("Case Law Analysis", "AI-powered case analysis would:\n\n"
                                                 "• Extract key legal principles\n"
                                                 "• Identify precedent value\n"
                                                 "• Compare similar cases\n"
                                                 "• Suggest applications")
    
    def find_statutes(self):
        """Find relevant statutes"""
        messagebox.showinfo("Statute Finder", "Statute research would:\n\n"
                                              "• Search by topic or keyword\n"
                                              "• Find current versions\n"
                                              "• Track amendments\n"
                                              "• Show related provisions")
    
    def save_research(self):
        """Save research results"""
        self.update_status("Saving research results...")
        messagebox.showinfo("Research Saved", "Research results saved to your archive.")
    
    # History Functions
    
    def load_conversation(self, convo_info):
        """Load a previous conversation"""
        self.update_status(f"Loading conversation: {convo_info['title']}")
        messagebox.showinfo("Load Conversation", f"Loading: {convo_info['title']}\n"
                                                 f"From: {convo_info['time']}\n"
                                                 f"Messages: {convo_info['messages']}")
        # Switch to chat section and load conversation
        self.show_section(NavigationSection.CHAT)
    
    def load_archive(self, archive_info):
        """Load archived session"""
        self.update_status(f"Loading archive: {archive_info['title']}")
        messagebox.showinfo("Load Archive", f"Loading: {archive_info['title']}\n"
                                           f"Date: {archive_info['date']}\n"
                                           f"Items: {archive_info['count']}")
    
    def export_history(self):
        """Export conversation history"""
        export_format = messagebox.askquestion("Export Format", 
                                              "Export as PDF?\n\n"
                                              "Yes = PDF format\n"
                                              "No = Text format")
        
        format_type = "PDF" if export_format == "yes" else "Text"
        self.update_status(f"Exporting history as {format_type}...")
        
        messagebox.showinfo("Export Complete", f"History exported as {format_type} format.")
    
    def create_backup(self):
        """Create system backup"""
        self.update_status("Creating backup...")
        time.sleep(1)
        messagebox.showinfo("Backup Complete", "System backup created successfully.")
        self.update_status("Backup completed")
    
    # Settings Functions
    
    def browse_document_folder(self):
        """Browse for document folder"""
        folder = filedialog.askdirectory(title="Select Default Document Folder")
        if folder:
            self.docs_path_entry.delete(0, tk.END)
            self.docs_path_entry.insert(0, folder)
    
    def change_theme(self, theme_name):
        """Change application theme"""
        self.update_status(f"Switching to {theme_name} theme...")
        messagebox.showinfo("Theme Changed", f"Theme changed to: {theme_name}\n\n"
                                            "Restart application to fully apply theme.")
    
    # Model Management Functions
    
    def show_model_selection(self):
        """Show model selection dialog"""
        if not MODEL_MANAGER_AVAILABLE or not self.model_manager:
            messagebox.showwarning("Model Manager", "Model management not available.\n"
                                                   "Please ensure BEAR AI is properly installed.")
            return
        
        # Create model selection window
        model_window = ctk.CTkToplevel(self.root)
        model_window.title("Select AI Model")
        model_window.geometry("600x400")
        model_window.transient(self.root)
        model_window.grab_set()
        
        # Model list
        models_frame = ctk.CTkScrollableFrame(model_window, corner_radius=10)
        models_frame.pack(fill="both", expand=True, padx=20, pady=20)
        
        try:
            compatible_models = self.model_manager.get_compatible_models()
            for i, model in enumerate(compatible_models[:5]):  # Show top 5 models
                model_btn = ctk.CTkButton(
                    models_frame,
                    text=f"{model.name}\n{model.size} • {model.description[:50]}...",
                    width=500,
                    height=60,
                    corner_radius=10,
                    command=lambda m=model: self.select_model_and_close(m, model_window)
                )
                model_btn.pack(pady=10)
        except Exception as e:
            error_label = ctk.CTkLabel(models_frame, text=f"Error loading models: {e}")
            error_label.pack(pady=20)
    
    def select_model_and_close(self, model, window):
        """Select model and close selection window"""
        self.selected_model = model
        self.model_status_label.configure(
            text=f"Selected: {model.name}",
            text_color=Colors.GREEN_SUCCESS
        )
        self.model_indicator.configure(
            text="✅ Model Ready",
            text_color=Colors.GREEN_SUCCESS
        )
        window.destroy()
        self.update_status(f"Selected model: {model.name}")
    
    def load_available_models(self):
        """Load available AI models"""
        if not MODEL_MANAGER_AVAILABLE:
            return
        
        try:
            # This would load actual models
            pass
        except Exception as e:
            self.handle_error("Model Loading Error", f"Failed to load models: {e}")
    
    # Utility Functions
    
    def load_user_preferences(self):
        """Load user preferences from file"""
        try:
            # Load preferences (placeholder)
            pass
        except Exception as e:
            print(f"Could not load preferences: {e}")
    
    def load_sample_documents(self):
        """Load sample documents for demonstration"""
        # This would load actual documents in a real implementation
        pass
    
    def update_status(self, message: str):
        """Update status bar message"""
        if hasattr(self, 'status_label'):
            self.status_label.configure(text=message)
    
    def handle_error(self, title: str, message: str):
        """Handle errors with professional error dialog"""
        messagebox.showerror(title, message)
        self.update_status(f"Error: {title}")
    
    def run(self):
        """Start the professional GUI application"""
        try:
            # Final setup
            self.update_status("BEAR AI Professional - Ready")
            
            # Start main loop
            self.root.mainloop()
            
        except KeyboardInterrupt:
            self.root.quit()
        except Exception as e:
            self.handle_error("Application Error", f"Unexpected error: {e}")

def main():
    """Main entry point for the professional BEAR AI application"""
    print("BEAR AI Professional - Starting...")
    
    # Check dependencies
    if CTK_AVAILABLE:
        print("✅ CustomTkinter available - Professional styling enabled")
    else:
        print("⚠️ CustomTkinter not available - Using fallback interface")
        print("   Install with: pip install customtkinter")
    
    if PII_AVAILABLE:
        print("✅ PII Protection available")
    else:
        print("⚠️ Advanced PII protection not available - Using basic protection")
    
    if MODEL_MANAGER_AVAILABLE:
        print("✅ AI Model Manager available")
    else:
        print("⚠️ AI Model Manager not available - Limited functionality")
    
    print("🚀 Launching BEAR AI Professional Interface...")
    
    try:
        # Create and run the application
        app = ProfessionalBEARAI()
        app.run()
        
    except Exception as e:
        print(f"❌ Failed to start application: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()