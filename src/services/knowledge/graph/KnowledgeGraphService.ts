import {
  Document,
  KnowledgeNode,
  KnowledgeConnection,
  KnowledgeGraph,
  KnowledgeCluster,
  GraphStatistics,
  KnowledgeBaseConfig
} from '../../../types/knowledge/types';
import { VectorDatabaseService } from '../database/VectorDatabaseService';
import { EmbeddingService } from '../indexing/EmbeddingService';

export class KnowledgeGraphService {
  private vectorDb: VectorDatabaseService;
  private embeddingService: EmbeddingService;
  private config: KnowledgeBaseConfig;
  private graph: KnowledgeGraph;
  private graphCache: Map<string, any> = new Map();

  constructor(config: KnowledgeBaseConfig, vectorDb: VectorDatabaseService) {
    this.config = config;
    this.vectorDb = vectorDb;
    this.embeddingService = new EmbeddingService(config.embeddingModel);
    this.graph = {
      nodes: new Map(),
      connections: [],
      clusters: [],
      statistics: this.initializeStatistics()
    };
  }

  private initializeStatistics(): GraphStatistics {
    return {
      totalNodes: 0,
      totalConnections: 0,
      avgDegree: 0,
      density: 0,
      modularity: 0,
      clusters: 0
    };
  }

  async addDocumentNode(document: Document): Promise<void> {
    try {
      // Create document node
      const docNode = await this.createDocumentNode(document);
      this.graph.nodes.set(docNode.id, docNode);

      // Extract and create concept nodes
      const conceptNodes = await this.extractConceptNodes(document);
      for (const conceptNode of conceptNodes) {
        if (!this.graph.nodes.has(conceptNode.id)) {
          this.graph.nodes.set(conceptNode.id, conceptNode);
        }
      }

      // Create entity nodes
      const entityNodes = await this.extractEntityNodes(document);
      for (const entityNode of entityNodes) {
        if (!this.graph.nodes.has(entityNode.id)) {
          this.graph.nodes.set(entityNode.id, entityNode);
        }
      }

      // Create connections
      await this.createDocumentConnections(document, docNode, conceptNodes, entityNodes);

      // Update clusters
      await this.updateClusters();

      // Update statistics
      this.updateStatistics();

      console.log(`Added document node: ${document.id} to knowledge graph`);
    } catch (error) {
      console.error('Error adding document node:', error);
      throw new Error(`Failed to add document node: ${error.message}`);
    }
  }

  private async createDocumentNode(document: Document): Promise<KnowledgeNode> {
    // Generate embedding for document if not exists
    let embedding: Float32Array | undefined;
    if (document.embeddings && document.embeddings.length > 0) {
      embedding = document.embeddings[0]; // Use first embedding
    } else {
      embedding = await this.embeddingService.generateEmbedding(document.title + ' ' + document.content.substring(0, 500));
    }

    return {
      id: `doc-${document.id}`,
      type: 'document',
      label: document.title,
      description: document.metadata.description || this.generateDescription(document),
      properties: {
        documentId: document.id,
        category: document.category,
        tags: document.tags,
        language: document.language,
        fileType: document.fileType,
        wordCount: document.metadata.wordCount,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt
      },
      embedding,
      connections: [],
      weight: this.calculateDocumentWeight(document),
      cluster: undefined
    };
  }

  private async extractConceptNodes(document: Document): Promise<KnowledgeNode[]> {
    const concepts = document.metadata.concepts || [];
    const conceptNodes: KnowledgeNode[] = [];

    for (const concept of concepts) {
      const conceptId = `concept-${this.normalizeId(concept)}`;
      
      // Check if concept already exists
      let existingNode = this.graph.nodes.get(conceptId);
      if (existingNode) {
        existingNode.weight += 0.1; // Increase weight for frequent concepts
        continue;
      }

      // Generate embedding for concept
      const embedding = await this.embeddingService.generateEmbedding(concept);

      const conceptNode: KnowledgeNode = {
        id: conceptId,
        type: 'concept',
        label: concept,
        description: `Concept: ${concept}`,
        properties: {
          name: concept,
          frequency: 1,
          documents: [document.id]
        },
        embedding,
        connections: [],
        weight: 1.0,
        cluster: undefined
      };

      conceptNodes.push(conceptNode);
    }

    return conceptNodes;
  }

  private async extractEntityNodes(document: Document): Promise<KnowledgeNode[]> {
    const entities = document.metadata.entityMentions || [];
    const entityNodes: KnowledgeNode[] = [];

    for (const entity of entities) {
      const entityId = `entity-${this.normalizeId(entity)}`;
      
      // Check if entity already exists
      let existingNode = this.graph.nodes.get(entityId);
      if (existingNode) {
        existingNode.weight += 0.2; // Increase weight for frequent entities
        if (existingNode.properties.documents) {
          existingNode.properties.documents.push(document.id);
        }
        continue;
      }

      // Generate embedding for entity
      const embedding = await this.embeddingService.generateEmbedding(entity);

      const entityNode: KnowledgeNode = {
        id: entityId,
        type: 'entity',
        label: entity,
        description: `Entity: ${entity}`,
        properties: {
          name: entity,
          frequency: 1,
          documents: [document.id],
          type: this.classifyEntity(entity)
        },
        embedding,
        connections: [],
        weight: 1.5, // Entities typically more important than concepts
        cluster: undefined
      };

      entityNodes.push(entityNode);
    }

    return entityNodes;
  }

  private async createDocumentConnections(
    document: Document,
    docNode: KnowledgeNode,
    conceptNodes: KnowledgeNode[],
    entityNodes: KnowledgeNode[]
  ): Promise<void> {
    // Connect document to concepts
    for (const conceptNode of conceptNodes) {
      const connection: KnowledgeConnection = {
        sourceId: docNode.id,
        targetId: conceptNode.id,
        type: 'contains',
        weight: 0.7,
        metadata: { relationshipType: 'document-concept' }
      };
      this.graph.connections.push(connection);
      docNode.connections.push(connection);
    }

    // Connect document to entities
    for (const entityNode of entityNodes) {
      const connection: KnowledgeConnection = {
        sourceId: docNode.id,
        targetId: entityNode.id,
        type: 'references',
        weight: 0.8,
        metadata: { relationshipType: 'document-entity' }
      };
      this.graph.connections.push(connection);
      docNode.connections.push(connection);
    }

    // Find similar documents and create connections
    await this.createSimilarityConnections(docNode);

    // Create concept-entity connections
    await this.createConceptEntityConnections(conceptNodes, entityNodes);
  }

  private async createSimilarityConnections(docNode: KnowledgeNode): Promise<void> {
    if (!docNode.embedding) return;

    // Find similar document nodes
    const similarVectors = await this.vectorDb.findSimilarVectors(
      docNode.embedding,
      10 // Top 10 similar documents
    );

    for (const similar of similarVectors) {
      if (similar.similarity < 0.6) continue; // Minimum similarity threshold
      
      const { documentId } = this.parseVectorId(similar.id);
      if (!documentId || documentId === docNode.properties.documentId) continue;

      const similarDocNodeId = `doc-${documentId}`;
      if (!this.graph.nodes.has(similarDocNodeId)) continue;

      // Create bidirectional similarity connection
      const connection: KnowledgeConnection = {
        sourceId: docNode.id,
        targetId: similarDocNodeId,
        type: 'similar',
        weight: similar.similarity,
        metadata: {
          relationshipType: 'document-similarity',
          similarity: similar.similarity
        }
      };

      this.graph.connections.push(connection);
      docNode.connections.push(connection);
    }
  }

  private async createConceptEntityConnections(
    conceptNodes: KnowledgeNode[],
    entityNodes: KnowledgeNode[]
  ): Promise<void> {
    // Create connections between related concepts and entities
    for (const conceptNode of conceptNodes) {
      for (const entityNode of entityNodes) {
        if (!conceptNode.embedding || !entityNode.embedding) continue;

        const similarity = EmbeddingService.cosineSimilarity(
          conceptNode.embedding,
          entityNode.embedding
        );

        if (similarity > 0.7) { // High similarity threshold for concept-entity relations
          const connection: KnowledgeConnection = {
            sourceId: conceptNode.id,
            targetId: entityNode.id,
            type: 'related',
            weight: similarity,
            metadata: {
              relationshipType: 'concept-entity',
              similarity
            }
          };

          this.graph.connections.push(connection);
          conceptNode.connections.push(connection);
        }
      }
    }
  }

  async updateDocumentNode(document: Document): Promise<void> {
    try {
      // Remove old connections
      await this.removeDocumentNode(document.id);
      
      // Add updated node
      await this.addDocumentNode(document);
    } catch (error) {
      console.error('Error updating document node:', error);
      throw new Error(`Failed to update document node: ${error.message}`);
    }
  }

  async removeDocumentNode(documentId: string): Promise<void> {
    try {
      const docNodeId = `doc-${documentId}`;
      const docNode = this.graph.nodes.get(docNodeId);
      
      if (!docNode) return;

      // Remove connections involving this document
      this.graph.connections = this.graph.connections.filter(conn => 
        conn.sourceId !== docNodeId && conn.targetId !== docNodeId
      );

      // Remove the document node
      this.graph.nodes.delete(docNodeId);

      // Update node connections arrays
      for (const node of this.graph.nodes.values()) {
        node.connections = node.connections.filter(conn =>
          conn.sourceId !== docNodeId && conn.targetId !== docNodeId
        );
      }

      // Clean up orphaned concept/entity nodes (with low weight)
      await this.cleanupOrphanedNodes();

      // Update clusters
      await this.updateClusters();

      // Update statistics
      this.updateStatistics();

      console.log(`Removed document node: ${documentId} from knowledge graph`);
    } catch (error) {
      console.error('Error removing document node:', error);
      throw new Error(`Failed to remove document node: ${error.message}`);
    }
  }

  private async cleanupOrphanedNodes(): Promise<void> {
    const toRemove: string[] = [];

    for (const [nodeId, node] of this.graph.nodes) {
      if (node.type !== 'document' && node.weight < 0.5) {
        // Check if node has any remaining document connections
        const hasDocConnections = this.graph.connections.some(conn =>
          (conn.sourceId === nodeId || conn.targetId === nodeId) &&
          (this.graph.nodes.get(conn.sourceId)?.type === 'document' ||
           this.graph.nodes.get(conn.targetId)?.type === 'document')
        );

        if (!hasDocConnections) {
          toRemove.push(nodeId);
        }
      }
    }

    // Remove orphaned nodes
    for (const nodeId of toRemove) {
      this.graph.nodes.delete(nodeId);
      this.graph.connections = this.graph.connections.filter(conn =>
        conn.sourceId !== nodeId && conn.targetId !== nodeId
      );
    }
  }

  async findSimilarDocuments(documentId: string, limit: number = 10): Promise<Document[]> {
    const docNodeId = `doc-${documentId}`;
    const docNode = this.graph.nodes.get(docNodeId);
    
    if (!docNode || !docNode.embedding) {
      console.warn(`Document node not found or no embedding: ${documentId}`);
      return [];
    }

    // Find similar vectors
    const similarVectors = await this.vectorDb.findSimilarVectors(
      docNode.embedding,
      limit + 1 // +1 to exclude the query document
    );

    const similarDocuments: Document[] = [];

    for (const similar of similarVectors) {
      const { documentId: similarDocId } = this.parseVectorId(similar.id);
      
      if (!similarDocId || similarDocId === documentId) continue;
      
      const document = await this.vectorDb.getDocument(similarDocId);
      if (document) {
        similarDocuments.push(document);
      }
    }

    return similarDocuments.slice(0, limit);
  }

  async getClusters(): Promise<KnowledgeCluster[]> {
    if (this.graph.clusters.length === 0) {
      await this.updateClusters();
    }
    return [...this.graph.clusters];
  }

  private async updateClusters(): Promise<void> {
    // Simple clustering based on embeddings using k-means-like approach
    const documentNodes = Array.from(this.graph.nodes.values())
      .filter(node => node.type === 'document' && node.embedding);

    if (documentNodes.length < 3) {
      this.graph.clusters = [];
      return;
    }

    const numClusters = Math.min(5, Math.floor(documentNodes.length / 3));
    const clusters = await this.performClustering(documentNodes, numClusters);
    
    this.graph.clusters = clusters;

    // Update node cluster assignments
    for (const cluster of clusters) {
      for (const nodeId of cluster.nodes) {
        const node = this.graph.nodes.get(nodeId);
        if (node) {
          node.cluster = cluster.id;
        }
      }
    }
  }

  private async performClustering(nodes: KnowledgeNode[], k: number): Promise<KnowledgeCluster[]> {
    // Simple k-means clustering
    const clusters: KnowledgeCluster[] = [];
    
    // Initialize cluster centroids randomly
    const centroids: Float32Array[] = [];
    const dimensions = nodes[0].embedding!.length;
    
    for (let i = 0; i < k; i++) {
      const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
      centroids.push(new Float32Array(randomNode.embedding!));
    }

    // Iterate until convergence
    let maxIterations = 20;
    let iteration = 0;
    let hasConverged = false;

    while (iteration < maxIterations && !hasConverged) {
      // Assign nodes to clusters
      const assignments: number[] = [];
      
      for (const node of nodes) {
        let bestCluster = 0;
        let bestDistance = Infinity;
        
        for (let i = 0; i < centroids.length; i++) {
          const distance = this.euclideanDistance(node.embedding!, centroids[i]);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestCluster = i;
          }
        }
        
        assignments.push(bestCluster);
      }

      // Update centroids
      const newCentroids: Float32Array[] = [];
      
      for (let i = 0; i < k; i++) {
        const clusterNodes = nodes.filter((_, idx) => assignments[idx] === i);
        
        if (clusterNodes.length === 0) {
          newCentroids.push(new Float32Array(centroids[i]));
          continue;
        }

        const newCentroid = new Float32Array(dimensions);
        
        for (const node of clusterNodes) {
          for (let j = 0; j < dimensions; j++) {
            newCentroid[j] += node.embedding![j];
          }
        }
        
        for (let j = 0; j < dimensions; j++) {
          newCentroid[j] /= clusterNodes.length;
        }
        
        newCentroids.push(newCentroid);
      }

      // Check convergence
      hasConverged = centroids.every((centroid, i) =>
        this.euclideanDistance(centroid, newCentroids[i]) < 0.001
      );

      centroids.splice(0, centroids.length, ...newCentroids);
      iteration++;
    }

    // Create cluster objects
    for (let i = 0; i < k; i++) {
      const clusterNodes = nodes.filter((_, idx) => 
        nodes.findIndex(n => n === nodes[idx]) !== -1 && 
        this.getClosestCentroid(nodes[idx].embedding!, centroids) === i
      );

      if (clusterNodes.length === 0) continue;

      const cluster: KnowledgeCluster = {
        id: `cluster-${i}`,
        label: this.generateClusterLabel(clusterNodes),
        nodes: clusterNodes.map(node => node.id),
        centroid: centroids[i],
        coherence: this.calculateClusterCoherence(clusterNodes),
        size: clusterNodes.length
      };

      clusters.push(cluster);
    }

    return clusters;
  }

  private getClosestCentroid(embedding: Float32Array, centroids: Float32Array[]): number {
    let bestCluster = 0;
    let bestDistance = Infinity;

    for (let i = 0; i < centroids.length; i++) {
      const distance = this.euclideanDistance(embedding, centroids[i]);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestCluster = i;
      }
    }

    return bestCluster;
  }

  private generateClusterLabel(nodes: KnowledgeNode[]): string {
    // Extract common themes from cluster nodes
    const categories = new Map<string, number>();
    const tags = new Map<string, number>();

    for (const node of nodes) {
      if (node.properties.category) {
        categories.set(node.properties.category, (categories.get(node.properties.category) || 0) + 1);
      }
      
      if (node.properties.tags) {
        for (const tag of node.properties.tags) {
          tags.set(tag, (tags.get(tag) || 0) + 1);
        }
      }
    }

    // Find most common category or tag
    const topCategory = Array.from(categories.entries()).sort((a, b) => b[1] - a[1])[0];
    const topTag = Array.from(tags.entries()).sort((a, b) => b[1] - a[1])[0];

    if (topCategory && topCategory[1] > nodes.length / 2) {
      return topCategory[0];
    } else if (topTag && topTag[1] > nodes.length / 3) {
      return topTag[0];
    } else {
      return `Cluster of ${nodes.length} documents`;
    }
  }

  private calculateClusterCoherence(nodes: KnowledgeNode[]): number {
    if (nodes.length < 2) return 1.0;

    let totalSimilarity = 0;
    let pairCount = 0;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].embedding && nodes[j].embedding) {
          const similarity = EmbeddingService.cosineSimilarity(
            nodes[i].embedding,
            nodes[j].embedding
          );
          totalSimilarity += similarity;
          pairCount++;
        }
      }
    }

    return pairCount > 0 ? totalSimilarity / pairCount : 0;
  }

  private euclideanDistance(a: Float32Array, b: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  private updateStatistics(): void {
    this.graph.statistics = {
      totalNodes: this.graph.nodes.size,
      totalConnections: this.graph.connections.length,
      avgDegree: this.calculateAverageDegree(),
      density: this.calculateDensity(),
      modularity: this.calculateModularity(),
      clusters: this.graph.clusters.length
    };
  }

  private calculateAverageDegree(): number {
    if (this.graph.nodes.size === 0) return 0;

    let totalDegree = 0;
    for (const node of this.graph.nodes.values()) {
      totalDegree += node.connections.length;
    }

    return totalDegree / this.graph.nodes.size;
  }

  private calculateDensity(): number {
    const nodeCount = this.graph.nodes.size;
    if (nodeCount < 2) return 0;

    const maxPossibleConnections = nodeCount * (nodeCount - 1) / 2;
    return this.graph.connections.length / maxPossibleConnections;
  }

  private calculateModularity(): number {
    // Simplified modularity calculation
    if (this.graph.clusters.length === 0) return 0;

    let modularity = 0;
    const totalConnections = this.graph.connections.length;

    for (const cluster of this.graph.clusters) {
      const clusterNodes = new Set(cluster.nodes);
      let internalConnections = 0;
      let totalDegree = 0;

      // Count internal connections and total degree
      for (const connection of this.graph.connections) {
        const sourceInCluster = clusterNodes.has(connection.sourceId);
        const targetInCluster = clusterNodes.has(connection.targetId);

        if (sourceInCluster && targetInCluster) {
          internalConnections++;
        }

        if (sourceInCluster || targetInCluster) {
          totalDegree++;
        }
      }

      const expectedInternal = (totalDegree / (2 * totalConnections)) ** 2;
      modularity += (internalConnections / totalConnections) - expectedInternal;
    }

    return modularity;
  }

  // Utility methods
  private generateDescription(document: Document): string {
    const sentences = document.content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return sentences.length > 0 ? sentences[0].trim() + '.' : document.title;
  }

  private calculateDocumentWeight(document: Document): number {
    let weight = 1.0;

    // Boost for longer documents
    weight += Math.min(2.0, document.metadata.wordCount / 1000);

    // Boost for documents with many tags
    weight += document.tags.length * 0.1;

    // Boost for recent documents
    const ageInDays = (Date.now() - new Date(document.createdAt).getTime()) / (24 * 60 * 60 * 1000);
    weight += Math.max(0, 1 - ageInDays / 365); // Decay over a year

    return Math.min(5.0, weight); // Cap at 5.0
  }

  private classifyEntity(entity: string): string {
    // Simple entity classification
    if (/\b[A-Z][a-z]+ [A-Z][a-z]+\b/.test(entity)) {
      return 'person';
    } else if (/\b[A-Z][a-z]+ (Inc|Corp|LLC|Ltd)\b/.test(entity)) {
      return 'organization';
    } else if (/^\d{4}$/.test(entity)) {
      return 'date';
    } else {
      return 'general';
    }
  }

  private normalizeId(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  private parseVectorId(vectorId: string): { documentId?: string; chunkId?: string } {
    if (vectorId.startsWith('chunk-')) {
      const parts = vectorId.split('-');
      if (parts.length >= 3) {
        return {
          documentId: parts.slice(1, -2).join('-'),
          chunkId: vectorId.substring(6)
        };
      }
    } else if (vectorId.startsWith('doc-')) {
      const parts = vectorId.split('-');
      if (parts.length >= 2) {
        return {
          documentId: parts.slice(1, -1).join('-')
        };
      }
    }
    
    return {};
  }

  // Public API methods
  async getGraph(): Promise<KnowledgeGraph> {
    return {
      ...this.graph,
      nodes: new Map(this.graph.nodes),
      connections: [...this.graph.connections],
      clusters: [...this.graph.clusters],
      statistics: { ...this.graph.statistics }
    };
  }

  async getNode(nodeId: string): Promise<KnowledgeNode | null> {
    return this.graph.nodes.get(nodeId) || null;
  }

  async getConnections(nodeId: string): Promise<KnowledgeConnection[]> {
    return this.graph.connections.filter(conn =>
      conn.sourceId === nodeId || conn.targetId === nodeId
    );
  }

  async optimize(): Promise<void> {
    console.log('Optimizing knowledge graph...');
    
    // Remove weak connections
    this.graph.connections = this.graph.connections.filter(conn => conn.weight > 0.3);

    // Update node connection arrays
    for (const node of this.graph.nodes.values()) {
      node.connections = this.graph.connections.filter(conn =>
        conn.sourceId === node.id || conn.targetId === node.id
      );
    }

    // Rebuild clusters
    await this.updateClusters();

    // Update statistics
    this.updateStatistics();

    console.log('Knowledge graph optimization completed');
  }

  clear(): void {
    this.graph.nodes.clear();
    this.graph.connections = [];
    this.graph.clusters = [];
    this.graph.statistics = this.initializeStatistics();
    this.graphCache.clear();
  }
}

export default KnowledgeGraphService;