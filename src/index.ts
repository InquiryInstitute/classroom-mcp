#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Google Classroom API scopes
const SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses',
  'https://www.googleapis.com/auth/classroom.coursework.students',
  'https://www.googleapis.com/auth/classroom.announcements',
  'https://www.googleapis.com/auth/classroom.rosters',
];

class ClassroomMCPServer {
  private server: Server;
  private classroom: any;

  constructor() {
    this.server = new Server(
      {
        name: 'classroom-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private async getAuthClient(): Promise<OAuth2Client> {
    const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || './credentials.json';
    const tokenPath = process.env.GOOGLE_TOKEN_PATH || './token.json';

    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Check if we have a token
    if (fs.existsSync(tokenPath)) {
      const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
      oAuth2Client.setCredentials(token);
    } else {
      throw new Error(
        'No token found. Please run authentication flow first. ' +
          'See README for instructions on generating token.json'
      );
    }

    return oAuth2Client;
  }

  private async initClassroom() {
    if (!this.classroom) {
      const auth = await this.getAuthClient();
      this.classroom = google.classroom({ version: 'v1', auth });
    }
    return this.classroom;
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getTools(),
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        return await this.handleToolCall(request.params.name, request.params.arguments || {});
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private getTools(): Tool[] {
    return [
      {
        name: 'classroom_create_course',
        description: 'Create a new Google Classroom course',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Course name (e.g., "AIN 2001 — Artificial Intelligence")',
            },
            section: {
              type: 'string',
              description: 'Section name (e.g., "Summer 2026")',
            },
            description: {
              type: 'string',
              description: 'Course description',
            },
            room: {
              type: 'string',
              description: 'Room number or location',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'classroom_list_courses',
        description: 'List all Google Classroom courses',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'classroom_get_course',
        description: 'Get details of a specific course',
        inputSchema: {
          type: 'object',
          properties: {
            courseId: {
              type: 'string',
              description: 'Course ID',
            },
          },
          required: ['courseId'],
        },
      },
      {
        name: 'classroom_create_assignment',
        description: 'Create an assignment (coursework) in Google Classroom',
        inputSchema: {
          type: 'object',
          properties: {
            courseId: {
              type: 'string',
              description: 'Course ID',
            },
            title: {
              type: 'string',
              description: 'Assignment title (e.g., "Lecture 1: Introduction")',
            },
            description: {
              type: 'string',
              description: 'Assignment description (supports HTML/Markdown)',
            },
            dueDate: {
              type: 'string',
              description: 'Due date in ISO 8601 format (YYYY-MM-DD)',
            },
            dueTime: {
              type: 'string',
              description: 'Due time in 24h format (HH:MM)',
            },
            maxPoints: {
              type: 'number',
              description: 'Maximum points for this assignment',
            },
            materials: {
              type: 'array',
              description: 'Array of materials (links, files, etc.)',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['link', 'form', 'video', 'file'],
                  },
                  url: { type: 'string' },
                  title: { type: 'string' },
                },
              },
            },
          },
          required: ['courseId', 'title'],
        },
      },
      {
        name: 'classroom_list_assignments',
        description: 'List all assignments for a course',
        inputSchema: {
          type: 'object',
          properties: {
            courseId: {
              type: 'string',
              description: 'Course ID',
            },
          },
          required: ['courseId'],
        },
      },
      {
        name: 'classroom_post_announcement',
        description: 'Post an announcement to the course stream',
        inputSchema: {
          type: 'object',
          properties: {
            courseId: {
              type: 'string',
              description: 'Course ID',
            },
            text: {
              type: 'string',
              description: 'Announcement text',
            },
          },
          required: ['courseId', 'text'],
        },
      },
      {
        name: 'classroom_add_student',
        description: 'Add/invite a student to a course',
        inputSchema: {
          type: 'object',
          properties: {
            courseId: {
              type: 'string',
              description: 'Course ID',
            },
            email: {
              type: 'string',
              description: 'Student email address',
            },
          },
          required: ['courseId', 'email'],
        },
      },
      {
        name: 'classroom_update_assignment',
        description: 'Update an existing assignment (coursework)',
        inputSchema: {
          type: 'object',
          properties: {
            courseId: {
              type: 'string',
              description: 'Course ID',
            },
            assignmentId: {
              type: 'string',
              description: 'Assignment ID to update',
            },
            title: {
              type: 'string',
              description: 'Assignment title',
            },
            description: {
              type: 'string',
              description: 'Assignment description',
            },
            materials: {
              type: 'array',
              description: 'Array of materials (links, files, etc.)',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['link', 'form', 'video', 'file'],
                  },
                  url: { type: 'string' },
                  title: { type: 'string' },
                },
              },
            },
          },
          required: ['courseId', 'assignmentId'],
        },
      },
    ];
  }

  private async handleToolCall(name: string, args: any) {
    const classroom = await this.initClassroom();

    switch (name) {
      case 'classroom_create_course':
        return await this.createCourse(classroom, args);

      case 'classroom_list_courses':
        return await this.listCourses(classroom);

      case 'classroom_get_course':
        return await this.getCourse(classroom, args.courseId);

      case 'classroom_create_assignment':
        return await this.createAssignment(classroom, args);

      case 'classroom_list_assignments':
        return await this.listAssignments(classroom, args.courseId);

      case 'classroom_post_announcement':
        return await this.postAnnouncement(classroom, args);

      case 'classroom_add_student':
        return await this.addStudent(classroom, args);

      case 'classroom_update_assignment':
        return await this.updateAssignment(classroom, args);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async createCourse(classroom: any, args: any) {
    const course = {
      name: args.name,
      section: args.section,
      description: args.description,
      room: args.room,
      ownerId: 'me',
      courseState: 'PROVISIONED',
    };

    const response = await classroom.courses.create({
      requestBody: course,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async listCourses(classroom: any) {
    const response = await classroom.courses.list({
      pageSize: 100,
    });

    const courses = response.data.courses || [];
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(courses, null, 2),
        },
      ],
    };
  }

  private async getCourse(classroom: any, courseId: string) {
    const response = await classroom.courses.get({
      id: courseId,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async createAssignment(classroom: any, args: any) {
    const coursework: any = {
      title: args.title,
      description: args.description,
      workType: 'ASSIGNMENT',
      state: 'PUBLISHED',
    };

    if (args.maxPoints) {
      coursework.maxPoints = args.maxPoints;
    }

    if (args.dueDate) {
      const [year, month, day] = args.dueDate.split('-').map(Number);
      coursework.dueDate = { year, month, day };

      if (args.dueTime) {
        const [hours, minutes] = args.dueTime.split(':').map(Number);
        coursework.dueTime = { hours, minutes };
      }
    }

    if (args.materials && args.materials.length > 0) {
      coursework.materials = args.materials.map((mat: any) => {
        if (mat.type === 'link') {
          return {
            link: {
              url: mat.url,
              title: mat.title,
            },
          };
        }
        // Add other material types as needed
        return mat;
      });
    }

    const response = await classroom.courses.courseWork.create({
      courseId: args.courseId,
      requestBody: coursework,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async listAssignments(classroom: any, courseId: string) {
    const response = await classroom.courses.courseWork.list({
      courseId: courseId,
      pageSize: 100,
    });

    const assignments = response.data.courseWork || [];
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(assignments, null, 2),
        },
      ],
    };
  }

  private async postAnnouncement(classroom: any, args: any) {
    const announcement = {
      text: args.text,
      state: 'PUBLISHED',
    };

    const response = await classroom.courses.announcements.create({
      courseId: args.courseId,
      requestBody: announcement,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async addStudent(classroom: any, args: any) {
    const student = {
      userId: args.email,
    };

    const response = await classroom.courses.students.create({
      courseId: args.courseId,
      requestBody: student,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async updateAssignment(classroom: any, args: any) {
    const updateMask: string[] = [];
    const coursework: any = {};

    if (args.title) {
      coursework.title = args.title;
      updateMask.push('title');
    }

    if (args.description) {
      coursework.description = args.description;
      updateMask.push('description');
    }

    if (args.materials && args.materials.length > 0) {
      coursework.materials = args.materials.map((mat: any) => {
        if (mat.type === 'link') {
          return {
            link: {
              url: mat.url,
              title: mat.title,
            },
          };
        }
        return mat;
      });
      updateMask.push('materials');
    }

    const response = await classroom.courses.courseWork.patch({
      courseId: args.courseId,
      id: args.assignmentId,
      updateMask: updateMask.join(','),
      requestBody: coursework,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Google Classroom MCP server running on stdio');
  }
}

const server = new ClassroomMCPServer();
server.run().catch(console.error);
