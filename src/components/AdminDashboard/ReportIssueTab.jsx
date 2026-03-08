import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Mail, Send, User, AlertCircle, CheckCircle } from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

const ReportIssueTab = () => {
  const { toast } = useToast();
  const { adminProfile, adminUser } = useAdminAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    body: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Auto-fill user info from admin context
  useEffect(() => {
    if (adminProfile && adminUser) {
      const userName = adminProfile.full_name || adminUser.email?.split('@')[0] || 'Admin User';
      const userEmail = adminUser.email || adminProfile.email || '';
      
      setFormData(prev => ({
        ...prev,
        name: userName,
        email: userEmail
      }));
    }
  }, [adminProfile, adminUser]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.body.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the email content
      const emailContent = `
From: ${formData.name} <${formData.email}>
Subject: ${formData.subject}

${formData.body}

---
This report was sent from the admin panel on ${new Date().toLocaleString()}
      `.trim();

      // In a real implementation, you would send this email via your backend
      // For now, we'll simulate the email sending
      console.log('Sending email:', emailContent);
      
      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Show success message
      toast({
        title: "Report Submitted",
        description: "Your issue has been sent to the company. We'll review it and get back to you soon.",
      });
      
      // Reset form (preserve user info)
      setFormData(prev => ({
        ...prev,
        subject: '',
        body: ''
      }));
      
      setIsSubmitted(true);
      
      // Reset submitted state after 3 seconds
      setTimeout(() => {
        setIsSubmitted(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error sending report:', error);
      toast({
        title: "Error",
        description: "Failed to send your report. Please try again or contact support.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="text-center py-12">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <CardTitle className="text-2xl text-green-700 mb-2">Report Submitted Successfully!</CardTitle>
          <CardDescription className="text-gray-600 mb-6">
            Your issue has been sent to the company. We'll review it and get back to you as soon as possible.
          </CardDescription>
          <Button 
            onClick={() => setIsSubmitted(false)}
            className="mt-4"
          >
            Send Another Report
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            Report an Issue
          </CardTitle>
          <CardDescription>
            Send a report or complaint to the company. We'll review your submission and respond as soon as possible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Your Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  required
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Your Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your.email@example.com"
                  required
                  className="w-full"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm font-medium">
                Subject <span className="text-red-500">*</span>
              </Label>
              <Input
                id="subject"
                name="subject"
                type="text"
                value={formData.subject}
                onChange={handleInputChange}
                placeholder="Brief description of the issue"
                required
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body" className="text-sm font-medium">
                Message <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="body"
                name="body"
                value={formData.body}
                onChange={handleInputChange}
                placeholder="Please provide detailed information about the issue you're reporting. Include any relevant details, steps to reproduce the issue, and what you expected to happen."
                rows={8}
                required
                className="w-full resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormData({
                  name: formData.name,
                  email: formData.email,
                  subject: '',
                  body: ''
                })}
              >
                Clear
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="ml-2">Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Report
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            What to Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-100 rounded-full mt-1 flex-shrink-0"></div>
              <div>
                <strong>Bugs & Technical Issues:</strong> Website errors, broken features, login problems
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-green-100 rounded-full mt-1 flex-shrink-0"></div>
              <div>
                <strong>Service Complaints:</strong> Poor service quality, staff behavior, facility issues
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-purple-100 rounded-full mt-1 flex-shrink-0"></div>
              <div>
                <strong>Product Issues:</strong> Product quality, pricing concerns, availability problems
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-red-100 rounded-full mt-1 flex-shrink-0"></div>
              <div>
                <strong>Account Problems:</strong> Billing issues, account access, profile changes
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-orange-100 rounded-full mt-1 flex-shrink-0"></div>
              <div>
                <strong>Other Concerns:</strong> General feedback, suggestions, questions
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportIssueTab;
